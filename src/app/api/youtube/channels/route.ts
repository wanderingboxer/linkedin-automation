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

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.youTubeChannel.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { videos: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("List channels error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const addChannelSchema = z.object({
  channelId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addChannelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.youTubeChannel.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: parsed.data.channelId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Channel already added" },
        { status: 409 }
      );
    }

    // TODO: Fetch channel info from YouTube API
    const channel = await prisma.youTubeChannel.create({
      data: {
        userId: user.id,
        channelId: parsed.data.channelId,
        name: "",
        enabled: true,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("Add channel error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
