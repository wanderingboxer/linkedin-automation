import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { getAuthorizationUrl } from "@/lib/linkedin/oauth";

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

    const state = `${user.id}:${randomBytes(16).toString("hex")}`;
    const authUrl = getAuthorizationUrl(state);

    return NextResponse.json({ authorizationUrl: authUrl, state });
  } catch (error) {
    console.error("LinkedIn connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
