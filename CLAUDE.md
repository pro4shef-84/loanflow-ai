# LoanFlow AI — Claude Project Context

## Project Overview
AI-powered loan origination platform for independent mortgage loan officers.
Hosted at: https://loanflow-ai-six.vercel.app

## Stack
- **Framework**: Next.js 16 (App Router), TypeScript
- **Database/Auth**: Supabase (`qwhuqahkpdxvbqxnhwig`)
- **AI**: Anthropic Claude API (`claude-haiku-4-5-20251001` for fast tasks)
- **Payments**: Stripe (test mode keys in .env.local)
- **UI**: Radix UI + Tailwind CSS v4
- **State**: TanStack React Query + Zustand
- **Validation**: Zod v4

## Credentials (stored in memory — do not re-ask user)
See: `~/.claude/projects/-Users-Shef/memory/MEMORY.md`

## Architecture Decisions

### API Routes
- All routes in `app/api/` check `supabase.auth.getUser()` and return 401 if unauthenticated
- Never use `as any` — use typed query result types (see pattern in `generate-preapproval/route.ts`)
- Always validate request bodies with Zod schemas from `lib/validation/api-schemas.ts`
- Use `parseBody(schema, rawBody)` helper — returns typed data or `{ success: false, error }`

### Database
- Schema in `supabase/migrations/001_initial_schema.sql`
- Hardening migration in `supabase/migrations/002_hardening.sql`
- Types in `lib/types/database.types.ts` — manually maintained (keep in sync with migrations)
- Row Level Security enabled on all tables
- Portal API routes use `createServiceClient()` (service role key, bypasses RLS) — correct by design

### Key Tables
| Table | Purpose |
|-------|---------|
| `users` | Extends Supabase auth — subscription tier, NMLS |
| `loan_files` | Core loan record |
| `loan_applications` | URLA 1003 data (one-to-one with loan_files) |
| `documents` | Uploaded documents with AI extraction |
| `conditions` | Lender/underwriting conditions |
| `lender_submissions` | Wholesale lender submission log |
| `disclosures` | TRID disclosure tracking (loan estimate, CD, etc.) |
| `messages` | SMS/email communication log |
| `contacts` | Borrowers, realtors, title contacts |
| `pulse_events` | AI-triggered re-engagement opportunities |
| `token_usage` | Claude API cost tracking |
| `lenders` | Wholesale lender directory (seeded with 8 real lenders) |

### Environment Variables
- Validated at startup via `lib/env.ts`
- Use `env.supabaseUrl` etc. from `lib/env.ts` instead of raw `process.env` with `!`

### Auth Flow
1. Email/password signup → creates user in `auth.users` → trigger creates `public.users`
2. Google OAuth → callback at `/auth/callback` → creates `public.users` if first login
3. Middleware at `lib/supabase/middleware.ts` protects all routes except `/`, `/login`, `/signup`, `/portal`, `/api/`, `/auth/`

### Applying DB Changes
```bash
SUPABASE_ACCESS_TOKEN=sbp_df858ddfe925fb590f491dcf8b8f74a2c8a6a4a5 supabase db push
```
Always create a new numbered migration file in `supabase/migrations/`.

## File Structure
```
app/
  (auth)/           # login, signup pages
  (dashboard)/      # protected app pages
    dashboard/      # main dashboard
    loans/[id]/     # loan detail tabs
      application/  # 1003 form
      aus/          # AUS simulation
      loan-estimate/# TRID loan estimate
      preapproval/  # Pre-approval letter generator
      submission/   # Lender submission log
      disclosures/  # TRID disclosure tracking
    pricing/        # Standalone pricing engine
    reports/mcr/    # Quarterly MCR report
  api/
    loans/          # Loan CRUD + sub-resources
    ai/             # Claude-powered features
    portal/         # Unauthenticated borrower portal
    webhooks/       # Stripe webhooks
  auth/callback/    # OAuth callback
  portal/[token]/   # Borrower-facing portal
components/
  layout/           # Sidebar, Header, MobileNav
  billing/          # UpgradePrompt
  onboarding/       # OnboardingChecklist
  ErrorBoundary.tsx # React error boundary
lib/
  env.ts            # Env var validation + typed access
  validation/
    api-schemas.ts  # Zod schemas for all API bodies
  types/
    database.types.ts  # Supabase table types
  supabase/
    client.ts       # Browser client
    server.ts       # Server client + service client
    middleware.ts   # Session refresh + route protection
  utils/
    pricing-engine.ts  # Rate/fee calculation logic
```

## Common Patterns

### Adding a new API route
```typescript
import { parseBody, mySchema } from "@/lib/validation/api-schemas";
// 1. Auth check
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
// 2. Validate body
const parsed = parseBody(mySchema, await request.json());
if (!parsed.success) return NextResponse.json(errorResponse(parsed.error), { status: 400 });
// 3. Verify resource ownership
const { data: loan } = await supabase.from("loan_files").select("id").eq("id", id).eq("user_id", user.id).single();
if (!loan) return NextResponse.json(errorResponse("Not found"), { status: 404 });
```

### Typing Supabase joined queries
```typescript
type LoanWithContact = Database["public"]["Tables"]["loan_files"]["Row"] & {
  contacts: Database["public"]["Tables"]["contacts"]["Row"] | null;
};
const { data } = await supabase.from("loan_files").select("*, contacts(*)").single();
const loan = data as unknown as LoanWithContact | null;
```
Use `as unknown as TypedResult` when Supabase can't infer join types. Never use `as any`.

## Vercel Deployment
- Project: `loanflow-ai` under `vproveenraos-projects`
- Auto-deploys from `main` branch
- Set env vars in Vercel dashboard — they mirror `.env.local`
