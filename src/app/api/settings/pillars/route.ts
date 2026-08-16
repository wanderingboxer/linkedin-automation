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

    const pillars = await prisma.contentPillar.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ pillars });
  } catch (error) {
    console.error("List pillars error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createPillarSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPillarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.contentPillar.findFirst({
      where: { userId: user.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const pillar = await prisma.contentPillar.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        keywords: parsed.data.keywords ?? [],
        excludedKeywords: parsed.data.excludedKeywords ?? [],
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ pillar }, { status: 201 });
  } catch (error) {
    console.error("Create pillar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const bulkUpdateSchema = z.array(
  z.object({
    id: z.string(),
    sortOrder: z.number().optional(),
    enabled: z.boolean().optional(),
  })
);

export async function PUT(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.contentPillar.updateMany({
          where: { id: item.id, userId: user.id },
          data: {
            ...(item.sortOrder !== undefined ? { sortOrder: item.sortOrder } : {}),
            ...(item.enabled !== undefined ? { enabled: item.enabled } : {}),
          },
        })
      )
    );

    const pillars = await prisma.contentPillar.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ pillars });
  } catch (error) {
    console.error("Bulk update pillars error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
