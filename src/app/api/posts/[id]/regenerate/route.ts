import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod/v4";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as { id: string };
}

const regenerateSchema = z.object({
  instruction: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = regenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
      include: {
        topic: { include: { sources: true } },
        versions: { orderBy: { version: "desc" } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!["DRAFT", "TEXT_APPROVED"].includes(post.status)) {
      return NextResponse.json(
        { error: `Cannot regenerate post in ${post.status} status` },
        { status: 400 }
      );
    }

    const newGenNumber = post.generationNumber + 1;

    // Store feedback if rejection reason provided
    if (parsed.data.rejectionReason) {
      await prisma.contentFeedback.create({
        data: {
          userId: user.id,
          postId: id,
          type: "REJECTION",
          reason: parsed.data.rejectionReason,
          metadata: { instruction: parsed.data.instruction },
        },
      });
    }

    // TODO: Call AI content regeneration engine
    // const regenerated = await contentEngine.regenerate({ post, instruction, rejectionReason, previousVersions });
    const regeneratedContent = `[Regenerated v${newGenNumber}: ${post.topic?.canonicalTitle ?? "post"}]`;

    const updated = await prisma.post.update({
      where: { id },
      data: {
        content: regeneratedContent,
        generationNumber: newGenNumber,
        rejectionReason: parsed.data.rejectionReason ?? null,
        approvedTextHash: null,
        textApprovedAt: null,
        status: "DRAFT",
        versions: {
          create: {
            content: regeneratedContent,
            version: newGenNumber,
            tone: post.tone,
            angle: post.angle,
            prompt: parsed.data.instruction ?? "",
          },
        },
      },
      include: {
        versions: { orderBy: { version: "desc" } },
        images: true,
      },
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Regenerate post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
