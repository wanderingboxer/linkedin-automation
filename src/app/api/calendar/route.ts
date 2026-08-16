import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as { id: string };
}

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const posts = await prisma.post.findMany({
      where: {
        userId: user.id,
        OR: [
          { scheduledAt: { gte: startDate, lte: endDate } },
          { publishedAt: { gte: startDate, lte: endDate } },
          {
            createdAt: { gte: startDate, lte: endDate },
            status: { in: ["DRAFT", "TEXT_APPROVED", "IMAGE_APPROVED", "READY_TO_PUBLISH"] },
          },
        ],
      },
      include: {
        topic: { select: { id: true, canonicalTitle: true } },
        images: { where: { active: true }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const grouped: Record<string, typeof posts> = {};
    for (const post of posts) {
      const date = (
        post.scheduledAt ?? post.publishedAt ?? post.createdAt
      )
        .toISOString()
        .split("T")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(post);
    }

    return NextResponse.json({
      month,
      year,
      posts: grouped,
    });
  } catch (error) {
    console.error("Calendar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
