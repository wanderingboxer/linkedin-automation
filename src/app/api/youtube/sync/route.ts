import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as { id: string };
}

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.youTubeChannel.findMany({
      where: { userId: user.id, enabled: true },
    });

    if (channels.length === 0) {
      return NextResponse.json(
        { error: "No enabled channels to sync" },
        { status: 400 }
      );
    }

    // TODO: Call YouTube API to fetch new videos for each channel
    // For each channel, fetch recent videos and store them

    // Update lastSyncAt for all synced channels
    await prisma.youTubeChannel.updateMany({
      where: { userId: user.id, enabled: true },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      synced: channels.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("YouTube sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
