import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!["DRAFT", "SCHEDULED", "TEXT_APPROVED", "IMAGE_APPROVED", "READY_TO_PUBLISH"].includes(post.status)) {
      return NextResponse.json(
        { error: `Cannot cancel post in ${post.status} status` },
        { status: 400 }
      );
    }

    // Cancel scheduled job if exists
    await prisma.scheduledJob.deleteMany({ where: { postId: id } });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        status: "CANCELLED",
        scheduledAt: null,
        scheduledTimezone: null,
      },
    });

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Cancel post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
