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

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateProfileSchema = z.object({
  name: z.string().optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  currentRole: z.string().optional(),
  previousRoles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  topicsOfInterest: z.array(z.string()).optional(),
  topicsToAvoid: z.array(z.string()).optional(),
  contentGoals: z.string().optional(),
  writingStyle: z.string().optional(),
  targetAudience: z.string().optional(),
  linkedinProfileUrl: z.string().optional(),
  postingFrequency: z.string().optional(),
  preferredPostTimes: z.array(z.string()).optional(),
  geoRelevance: z.string().optional(),
  preferredLanguages: z.array(z.string()).optional(),
  contentPillars: z.array(z.string()).optional(),
});

export async function PUT(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.update({
      where: { userId: user.id },
      data: parsed.data,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
