/**
 * Centralized environment variable validation.
 * Import and call validateEnv() in app/layout.tsx (server-side) to catch
 * missing vars at startup rather than at runtime deep in request handlers.
 */

const REQUIRED_SERVER_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
] as const;

const OPTIONAL_SERVER_VARS = [
  "ANTHROPIC_API_KEY",
] as const;

export function validateEnv(): void {
  if (typeof window !== "undefined") return; // client-side: skip

  const missing = REQUIRED_SERVER_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[LoanFlow AI] Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
      `Check your .env.local file or Vercel project settings.`
    );
  }
}

/** Typed access to env vars — avoids scattered `process.env.X!` with no validation */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  geminiApiKey: process.env.GEMINI_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeStarterPriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripeTeamPriceId: process.env.STRIPE_TEAM_PRICE_ID ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
