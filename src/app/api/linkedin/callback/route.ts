import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  exchangeAuthorizationCode,
  getCurrentMember,
} from "@/lib/linkedin/oauth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      const redirectUrl = new URL("/settings", request.url);
      redirectUrl.searchParams.set("linkedin_error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 }
      );
    }

    // Extract userId from state (format: userId:randomHex)
    const userId = state.split(":")[0];
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid state parameter" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Exchange code for tokens
    const tokens = await exchangeAuthorizationCode(code);

    // Get member info
    const member = await getCurrentMember(tokens.accessToken);

    // Store connection
    await prisma.linkedInConnection.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        memberUrn: `urn:li:person:${member.id}`,
        memberName: member.name,
        memberImage: member.picture,
        scopes: "openid,profile,email,w_member_social",
        connected: true,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        memberUrn: `urn:li:person:${member.id}`,
        memberName: member.name,
        memberImage: member.picture,
        scopes: "openid,profile,email,w_member_social",
        connected: true,
      },
    });

    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("linkedin_connected", "true");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    const redirectUrl = new URL("/settings", request.url);
    redirectUrl.searchParams.set("linkedin_error", "callback_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
