import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHash } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as { id: string };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
      include: { images: { where: { active: true }, take: 1 } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "TEXT_APPROVED") {
      return NextResponse.json(
        { error: `Cannot approve image for post in ${post.status} status. Text must be approved first.` },
        { status: 400 }
      );
    }

    const activeImage = post.images[0];
    if (!activeImage) {
      return NextResponse.json(
        { error: "No active image to approve. Generate an image first." },
        { status: 400 }
      );
    }

    // Hash the image file path as a proxy (in production, hash the actual file bytes)
    const imageHash = createHash("sha256")
      .update(activeImage.filePath)
      .digest("hex");

    await prisma.generatedImage.update({
      where: { id: activeImage.id },
      data: { approved: true, imageHash },
    });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        approvedImageHash: imageHash,
        imageApprovedAt: new Date(),
        status: "READY_TO_PUBLISH",
      },
    });

    return NextResponse.json({
      post: updated,
      approvedImageHash: imageHash,
    });
  } catch (error) {
    console.error("Approve image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
