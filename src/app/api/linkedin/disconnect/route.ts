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

    await prisma.linkedInConnection.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, disconnected: true });
  } catch (error) {
    console.error("LinkedIn disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
