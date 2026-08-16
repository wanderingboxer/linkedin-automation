import type { LinkedInTokenResponse, LinkedInMember } from "@/types";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_URL = "https://api.linkedin.com/v2";

function getConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing LinkedIn OAuth env vars: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  const scopes = [
    "openid",
    "profile",
    "email",
    "w_member_social",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  code: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getConfig();

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token ?? undefined,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getConfig();

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token refresh failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token ?? undefined,
  };
}

export async function getCurrentMember(
  accessToken: string
): Promise<LinkedInMember> {
  const response = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn member fetch failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  return {
    id: data.sub,
    name: data.name || `${data.given_name ?? ""} ${data.family_name ?? ""}`.trim(),
    picture: data.picture || "",
  };
}
