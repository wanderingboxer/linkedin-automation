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
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "DRAFT") {
      return NextResponse.json(
        { error: `Cannot approve text for post in ${post.status} status` },
        { status: 400 }
      );
    }

    const textHash = createHash("sha256").update(post.content).digest("hex");

    const updated = await prisma.post.update({
      where: { id },
      data: {
        approvedTextHash: textHash,
        textApprovedAt: new Date(),
        status: "TEXT_APPROVED",
      },
    });

    return NextResponse.json({
      post: updated,
      approvedTextHash: textHash,
    });
  } catch (error) {
    console.error("Approve text error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
