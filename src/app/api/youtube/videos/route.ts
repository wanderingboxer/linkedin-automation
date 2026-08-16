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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const channels = await prisma.youTubeChannel.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const channelIds = channels.map((c) => c.id);

    const [videos, total] = await Promise.all([
      prisma.youTubeVideo.findMany({
        where: { channelId: { in: channelIds } },
        include: {
          insights: true,
          channel: { select: { name: true, channelId: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.youTubeVideo.count({
        where: { channelId: { in: channelIds } },
      }),
    ]);

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List videos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
