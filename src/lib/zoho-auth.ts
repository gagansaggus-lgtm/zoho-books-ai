import prisma from "@/lib/prisma";

const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_ACCOUNTS_CA_URL = "https://accounts.zohocloud.ca";

function getAccountsUrl(): string {
  // Transway Group is Canadian, use .ca domain
  return process.env.ZOHO_DOMAIN === "com" ? ZOHO_ACCOUNTS_URL : ZOHO_ACCOUNTS_CA_URL;
}

export function getAuthorizationUrl(clientId: string, redirectUri: string): string {
  const baseUrl = getAccountsUrl();
  const scopes = [
    "ZohoBooks.fullaccess.all",
  ].join(",");

  const params = new URLSearchParams({
    scope: scopes,
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    access_type: "offline",
    prompt: "consent",
  });

  return `${baseUrl}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const baseUrl = getAccountsUrl();
  const response = await fetch(`${baseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`OAuth error: ${data.error}`);
  }

  // Store tokens
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.zohoTokens.upsert({
    where: { id: "default" },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      expiresAt,
      clientId,
      clientSecret,
    },
    create: {
      id: "default",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      clientId,
      clientSecret,
    },
  });

  return data;
}

export async function refreshAccessToken(): Promise<string> {
  const tokens = await prisma.zohoTokens.findUnique({ where: { id: "default" } });
  if (!tokens) {
    throw new Error("No Zoho tokens found. Please connect your Zoho account first.");
  }

  const baseUrl = getAccountsUrl();
  const response = await fetch(`${baseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: tokens.clientId,
      client_secret: tokens.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error}`);
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.zohoTokens.update({
    where: { id: "default" },
    data: { accessToken: data.access_token, expiresAt },
  });

  return data.access_token;
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await prisma.zohoTokens.findUnique({ where: { id: "default" } });
  if (!tokens) {
    throw new Error("ZOHO_NOT_CONNECTED");
  }

  // Refresh if expires in less than 5 minutes
  if (new Date(tokens.expiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    return refreshAccessToken();
  }

  return tokens.accessToken;
}

export async function isZohoConnected(): Promise<boolean> {
  try {
    const tokens = await prisma.zohoTokens.findUnique({ where: { id: "default" } });
    return !!tokens?.refreshToken;
  } catch {
    return false;
  }
}

export async function disconnectZoho(): Promise<void> {
  try {
    await prisma.zohoTokens.delete({ where: { id: "default" } });
  } catch {
    // Already disconnected
  }
}
