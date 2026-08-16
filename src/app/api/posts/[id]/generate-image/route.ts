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

const generateImageSchema = z.object({
  style: z.string().optional(),
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
    const parsed = generateImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "TEXT_APPROVED") {
      return NextResponse.json(
        { error: "Text must be approved before generating an image" },
        { status: 400 }
      );
    }

    // Deactivate previous images
    await prisma.generatedImage.updateMany({
      where: { postId: id },
      data: { active: false },
    });

    // TODO: Call AI image generation engine
    // const imageResult = await imageEngine.generate({ post, style });
    const placeholderPath = `/uploads/images/${id}-v1.png`;
    const imagePrompt = `Image for post: ${post.content.slice(0, 100)}`;

    const image = await prisma.generatedImage.create({
      data: {
        postId: id,
        prompt: imagePrompt,
        filePath: placeholderPath,
        style: parsed.data.style ?? "",
        version: 1,
        active: true,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Generate image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
