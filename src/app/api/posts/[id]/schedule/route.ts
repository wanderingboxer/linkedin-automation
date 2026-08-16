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

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  timezone: z.string().default("UTC"),
});

export async function POST(
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
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const post = await prisma.post.findFirst({
      where: { id, userId: user.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "READY_TO_PUBLISH") {
      return NextResponse.json(
        { error: `Cannot schedule post in ${post.status} status. Post must be fully approved.` },
        { status: 400 }
      );
    }

    const executeAt = new Date(parsed.data.scheduledAt);

    if (executeAt <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled time must be in the future" },
        { status: 400 }
      );
    }

    // Upsert scheduled job
    const job = await prisma.scheduledJob.upsert({
      where: { postId: id },
      create: {
        postId: id,
        executeAt,
        status: "PENDING",
      },
      update: {
        executeAt,
        status: "PENDING",
        attempts: 0,
        lastError: null,
      },
    });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: executeAt,
        scheduledTimezone: parsed.data.timezone,
      },
    });

    return NextResponse.json({
      post: updated,
      job: { id: job.id, executeAt: job.executeAt, status: job.status },
    });
  } catch (error) {
    console.error("Schedule post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
