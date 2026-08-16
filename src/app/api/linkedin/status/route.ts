import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

    const connection = await prisma.linkedInConnection.findUnique({
      where: { userId: user.id },
      select: {
        connected: true,
        memberName: true,
        memberImage: true,
        expiresAt: true,
        scopes: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        member: null,
      });
    }

    const isExpired = connection.expiresAt < new Date();

    return NextResponse.json({
      connected: connection.connected && !isExpired,
      expired: isExpired,
      member: {
        name: connection.memberName,
        image: connection.memberImage,
      },
      expiresAt: connection.expiresAt,
      connectedAt: connection.createdAt,
    });
  } catch (error) {
    console.error("LinkedIn status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
