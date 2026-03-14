/**
 * Seed script for LoanFlow AI (env-var version)
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * Requires USER_ID env var or CLI argument for the officer's auth user ID.
 *
 * Usage:
 *   USER_ID=<uuid> npx tsx scripts/seed.ts
 *   npx tsx scripts/seed.ts <uuid>
 *
 * Alternatively, source .env.local first:
 *   source .env.local && USER_ID=<uuid> npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Re-export main logic from seed-api.ts would duplicate — keep this as a thin wrapper
// that delegates to the same logic. For simplicity we inline a streamlined version.

async function main() {
  const userId = process.env.USER_ID ?? process.argv[2];
  if (!userId) {
    // Try to auto-detect
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error || !users?.length) {
      console.error("No USER_ID provided and could not auto-detect. Pass USER_ID env var.");
      process.exit(1);
    }
    console.log(`Auto-detected user: ${users[0].email} (${users[0].id})`);
    process.env.USER_ID = users[0].id;
  }

  // Dynamically import the main seed script
  // Since they share the same runtime, just run it directly
  console.log("Delegating to seed-api.ts...\n");
  await import("./seed-api.js");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
