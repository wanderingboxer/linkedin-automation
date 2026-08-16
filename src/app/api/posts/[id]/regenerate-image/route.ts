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

const regenerateImageSchema = z.object({
  style: z.string().optional(),
  concept: z.string().optional(),
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
    const body = await request.json().catch(() => ({}));
    const parsed = regenerateImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
      include: { images: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!["TEXT_APPROVED", "IMAGE_APPROVED"].includes(post.status)) {
      return NextResponse.json(
        { error: "Text must be approved before regenerating images" },
        { status: 400 }
      );
    }

    const latestVersion = post.images[0]?.version ?? 0;
    const newVersion = latestVersion + 1;

    // Deactivate previous images
    await prisma.generatedImage.updateMany({
      where: { postId: id },
      data: { active: false },
    });

    // TODO: Call AI image regeneration engine
    const placeholderPath = `/uploads/images/${id}-v${newVersion}.png`;
    const imagePrompt = parsed.data.concept
      ? `${parsed.data.concept} - ${post.content.slice(0, 80)}`
      : `Image v${newVersion} for post: ${post.content.slice(0, 100)}`;

    // Clear image approval since we have a new image
    await prisma.post.update({
      where: { id },
      data: {
        approvedImageHash: null,
        imageApprovedAt: null,
        status: "TEXT_APPROVED",
      },
    });

    const image = await prisma.generatedImage.create({
      data: {
        postId: id,
        prompt: imagePrompt,
        filePath: placeholderPath,
        style: parsed.data.style ?? "",
        version: newVersion,
        active: true,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Regenerate image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
