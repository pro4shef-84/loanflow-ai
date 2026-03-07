-- =============================================================================
-- Migration 003: Rate Sheets
-- Stores lender rate sheets (uploaded PDFs) and Claude-parsed rate data.
-- Allows the pricing engine to use real lender rates instead of hardcoded ones.
-- =============================================================================

create table if not exists public.rate_sheets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.users(id) on delete cascade not null,
  lender_id         uuid references public.lenders(id),
  lender_name       text not null,
  effective_date    date,
  expires_at        timestamptz,
  file_path         text,
  original_filename text,
  status            text not null default 'processing'
                    check (status in ('processing', 'parsed', 'failed', 'active', 'superseded')),
  -- Parsed rate data from Claude
  -- Structure: { programs: [{ key, label, rates: [{ rate, par_price, points }] }], raw_adjustments: string }
  parsed_rates      jsonb,
  parse_error       text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.rate_sheets enable row level security;

create policy "Users can manage own rate sheets"
  on public.rate_sheets for all
  using (auth.uid() = user_id);

create index if not exists idx_rate_sheets_user_id on public.rate_sheets(user_id);
create index if not exists idx_rate_sheets_status  on public.rate_sheets(status);

create trigger trg_rate_sheets_updated
  before update on public.rate_sheets
  for each row execute function update_updated_at();
