import { createNeonAuth, type NeonAuth } from "@neon/auth/next/server";

let authInstance: NeonAuth | undefined;

function getCookieSecret(): string | undefined {
  return process.env.NEON_AUTH_COOKIE_SECRET ?? process.env.BETTER_AUTH_SECRET;
}

export function isNeonAuthConfigured(): boolean {
  const secret = getCookieSecret();
  return Boolean(
    process.env.NEON_AUTH_BASE_URL &&
      secret &&
      secret.length >= 32,
  );
}

export function getNeonAuth(): NeonAuth {
  if (authInstance) return authInstance;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = getCookieSecret();

  if (!baseUrl || !secret || secret.length < 32) {
    throw new Error("Neon Auth requires NEON_AUTH_BASE_URL and a cookie secret of at least 32 characters.");
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new Error("NEON_AUTH_BASE_URL must be a valid URL.");
  }

  authInstance = createNeonAuth({
    baseUrl,
    cookies: { secret },
  });

  return authInstance;
}

export async function getAuthenticatedUser() {
  const result = await getNeonAuth().getSession();
  if (result.error) {
    throw new Error(`Neon Auth session lookup failed (${result.error.code}).`);
  }
  return result.data?.user ?? null;
}
