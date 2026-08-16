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

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 400 }
      );
    }

    const pillars = await prisma.contentPillar.findMany({
      where: { userId: user.id, enabled: true },
      orderBy: { sortOrder: "asc" },
    });

    // TODO: Call the discovery engine with profile and pillars
    // For now, return a placeholder indicating the engine should be called
    // const discoveredTopics = await discoveryEngine.discover(profile, pillars);

    // Store discovered topics in DB (placeholder for actual implementation)
    const topics = await prisma.topic.findMany({
      where: {
        userId: user.id,
        discoveredAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: { sources: true },
      orderBy: { overallScore: "desc" },
    });

    return NextResponse.json({
      topics,
      discoveredAt: new Date().toISOString(),
      count: topics.length,
    });
  } catch (error) {
    console.error("Topic discovery error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
