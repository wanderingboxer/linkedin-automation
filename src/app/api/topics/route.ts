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
    const category = searchParams.get("category");
    const minScore = parseFloat(searchParams.get("minScore") ?? "0");
    const days = parseInt(searchParams.get("days") ?? "7");

    const where = {
      userId: user.id,
      dismissed: false,
      discoveredAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
      overallScore: { gte: minScore },
      ...(category ? { category } : {}),
    };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        include: { sources: true, pillar: true },
        orderBy: { overallScore: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.topic.count({ where }),
    ]);

    return NextResponse.json({
      topics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List topics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
