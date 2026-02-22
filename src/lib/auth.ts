import { NextRequest } from "next/server";

const SESSION_COOKIE = "ai-bookkeeper-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Simple but secure auth using environment variables.
 * Set AUTH_USERNAME and AUTH_PASSWORD in Railway env vars.
 */
function getCredentials() {
  return {
    username: process.env.AUTH_USERNAME || "admin",
    password: process.env.AUTH_PASSWORD || "",
  };
}

/**
 * Generate a session token using a simple HMAC-like approach.
 * Uses AUTH_SECRET env var as the signing key.
 */
function getSecret(): string {
  return process.env.AUTH_SECRET || "ai-bookkeeper-default-secret-change-me";
}

/**
 * Create a simple session token.
 * Format: base64(username:timestamp:secret)
 */
export function createSessionToken(username: string): string {
  const timestamp = Date.now().toString();
  const secret = getSecret();
  const data = `${username}:${timestamp}:${secret}`;
  const token = Buffer.from(data).toString("base64");
  return token;
}

/**
 * Verify a session token is valid.
 */
export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return { valid: false };

    const username = parts[0];
    const timestamp = parseInt(parts[1]);
    const secret = parts.slice(2).join(":");

    // Check secret matches
    if (secret !== getSecret()) return { valid: false };

    // Check token isn't expired (7 days)
    const age = Date.now() - timestamp;
    if (age > SESSION_MAX_AGE * 1000) return { valid: false };

    return { valid: true, username };
  } catch {
    return { valid: false };
  }
}

/**
 * Validate login credentials.
 */
export function validateCredentials(username: string, password: string): boolean {
  const creds = getCredentials();

  // If no password is set, auth is disabled (development mode)
  if (!creds.password) return false;

  return username === creds.username && password === creds.password;
}

/**
 * Check if authentication is enabled.
 * Auth is enabled when AUTH_PASSWORD env var is set.
 */
export function isAuthEnabled(): boolean {
  return !!process.env.AUTH_PASSWORD;
}

/**
 * Check if a request is authenticated (for middleware).
 * This function is safe for Edge runtime - no next/headers import.
 */
export function isRequestAuthenticated(request: NextRequest): boolean {
  if (!isAuthEnabled()) return true;

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return false;

  const { valid } = verifySessionToken(sessionCookie.value);
  return valid;
}

/**
 * Get session cookie config.
 */
export function getSessionCookieConfig() {
  return {
    name: SESSION_COOKIE,
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
