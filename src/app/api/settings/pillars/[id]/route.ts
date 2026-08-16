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

const updatePillarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().optional(),
  keywords: z.array(z.string()).optional(),
  excludedKeywords: z.array(z.string()).optional(),
  sortOrder: z.number().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updatePillarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.contentPillar.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pillar not found" }, { status: 404 });
    }

    const pillar = await prisma.contentPillar.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ pillar });
  } catch (error) {
    console.error("Update pillar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.contentPillar.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Pillar not found" }, { status: 404 });
    }

    await prisma.contentPillar.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete pillar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
