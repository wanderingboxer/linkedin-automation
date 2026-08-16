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
      include: {
        topic: { include: { sources: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // TODO: Call AI fact-checking engine
    // const result = await factChecker.check(post.content, post.topic?.sources ?? []);
    const placeholderResult = {
      status: "pass" as const,
      claims: [],
      overallConfidence: 1.0,
      suggestions: [],
    };

    const updated = await prisma.post.update({
      where: { id },
      data: { factCheckResult: placeholderResult },
    });

    return NextResponse.json({
      post: updated,
      factCheck: placeholderResult,
    });
  } catch (error) {
    console.error("Fact check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
