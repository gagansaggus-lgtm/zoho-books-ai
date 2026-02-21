import prisma from "@/lib/prisma";

/**
 * Get the Anthropic API key from the database or environment variable.
 * Priority: Database > Environment Variable
 */
export async function getAnthropicApiKey(): Promise<string | null> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (settings?.anthropicApiKey) return settings.anthropicApiKey;
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  return null;
}

/**
 * Get the AI model from settings or default.
 */
export async function getAiModel(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  return settings?.aiModel || "claude-sonnet-4-20250514";
}

/**
 * Get the app's base URL for OAuth redirects.
 * Uses NEXT_PUBLIC_APP_URL env var, or RAILWAY_PUBLIC_DOMAIN, or falls back to localhost.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "http://localhost:3001";
}
