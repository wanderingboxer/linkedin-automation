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

const generateSchema = z.object({
  topicId: z.string().min(1),
  tone: z.string().default("insightful"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  angle: z.string().default(""),
});

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { topicId, tone, length, angle } = parsed.data;

    const topic = await prisma.topic.findFirst({
      where: { id: topicId, userId: user.id },
      include: { sources: true },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
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

    // TODO: Call AI content generation engine
    // const generatedContent = await contentEngine.generate({ topic, profile, tone, length, angle });
    const placeholderContent = `[Generated post about: ${topic.canonicalTitle}]`;

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        topicId,
        content: placeholderContent,
        tone,
        length,
        angle,
        status: "DRAFT",
        generationNumber: 1,
        versions: {
          create: {
            content: placeholderContent,
            version: 1,
            tone,
            angle,
          },
        },
      },
      include: {
        versions: true,
        images: true,
        topic: { include: { sources: true } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Generate post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
