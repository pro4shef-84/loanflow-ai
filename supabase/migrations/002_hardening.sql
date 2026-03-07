-- =============================================================================
-- Migration 002: Architecture Hardening
-- Adds: loan_applications table, disclosures table, DB indexes
-- Fixes: Portal RLS security vulnerability (open policies removed)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FIX: Remove dangerously open portal RLS policies
-- These allowed ANY anonymous user to read ALL loan files and write ANY document
-- The portal API routes use createServiceClient() (service role) so these are
-- both redundant and a critical security hole.
-- -----------------------------------------------------------------------------
drop policy if exists "Portal token read access for loan files" on public.loan_files;
drop policy if exists "Portal token read/write for documents" on public.documents;

-- -----------------------------------------------------------------------------
-- TABLE: loan_applications (replaces piggyback-on-notes hack)
-- Stores URLA/1003 mortgage application data properly
-- One application per loan file (unique constraint enforced)
-- -----------------------------------------------------------------------------
create table if not exists public.loan_applications (
  id                        uuid primary key default gen_random_uuid(),
  loan_file_id              uuid references public.loan_files(id) on delete cascade not null unique,

  -- Borrower Info
  borrower_first_name       text,
  borrower_last_name        text,
  borrower_ssn_last4        text,
  borrower_dob              date,
  borrower_email            text,
  borrower_phone            text,
  borrower_marital_status   text check (borrower_marital_status in ('married','separated','unmarried')),
  borrower_dependents       integer,
  borrower_citizenship      text check (borrower_citizenship in ('us_citizen','permanent_resident','non_permanent_resident')) default 'us_citizen',

  -- Current Address
  current_address           text,
  current_city              text,
  current_state             text,
  current_zip               text,
  current_housing           text check (current_housing in ('own','rent','living_rent_free')),
  years_at_address          integer,

  -- Employment
  employer_name             text,
  employer_address          text,
  employer_phone            text,
  employment_start_date     date,
  years_employed            numeric,
  job_title                 text,
  self_employed             boolean default false,

  -- Income (monthly)
  base_income               numeric,
  overtime_income           numeric,
  bonus_income              numeric,
  commission_income         numeric,
  other_income              numeric,

  -- Assets
  checking_balance          numeric,
  savings_balance           numeric,
  retirement_balance        numeric,
  other_assets              jsonb default '[]'::jsonb,

  -- Liabilities
  liabilities               jsonb default '[]'::jsonb,

  -- Declarations
  outstanding_judgments     boolean default false,
  declared_bankruptcy       boolean default false,
  property_foreclosed       boolean default false,
  party_to_lawsuit          boolean default false,
  loan_obligations          boolean default false,
  delinquent_federal_debt   boolean default false,
  co_maker_note             boolean default false,
  intend_to_occupy          boolean default true,
  ownership_interest        boolean default false,

  -- Co-Borrower (full URLA Section for co-borrower)
  co_borrower               jsonb,

  -- Completion tracking
  completed_sections        text[] default '{}',
  completed_at              timestamptz,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.loan_applications enable row level security;

create policy "Users can manage own applications"
  on public.loan_applications
  for all
  using (
    auth.uid() = (select user_id from public.loan_files where id = loan_file_id)
  );

create trigger trg_loan_applications_updated
  before update on public.loan_applications
  for each row execute function update_updated_at();

-- -----------------------------------------------------------------------------
-- TABLE: disclosures (TRID disclosure tracking)
-- Replaces the UI-only disclosure tracking that had zero persistence
-- -----------------------------------------------------------------------------
create table if not exists public.disclosures (
  id                uuid primary key default gen_random_uuid(),
  loan_file_id      uuid references public.loan_files(id) on delete cascade not null,

  disclosure_type   text not null check (disclosure_type in (
    'loan_estimate',
    'closing_disclosure',
    'intent_to_proceed',
    'right_to_cancel',
    'anti_steering',
    'affiliated_business',
    'servicing',
    'arm_disclosure',
    'initial_escrow',
    'homeowners_insurance'
  )),
  stage             text not null default 'initial' check (stage in ('initial', 'revised', 'final')),
  status            text not null default 'pending' check (status in ('pending', 'sent', 'viewed', 'signed', 'waived')),

  sent_at           timestamptz,
  viewed_at         timestamptz,
  signed_at         timestamptz,
  waived_at         timestamptz,

  due_date          date,
  method            text check (method in ('email', 'in_person', 'mail', 'electronic')),
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.disclosures enable row level security;

create policy "Users can manage own disclosures"
  on public.disclosures
  for all
  using (
    auth.uid() = (select user_id from public.loan_files where id = loan_file_id)
  );

create trigger trg_disclosures_updated
  before update on public.disclosures
  for each row execute function update_updated_at();

-- -----------------------------------------------------------------------------
-- INDEXES: Critical for performance as data grows
-- Without these, every query does a full table scan
-- -----------------------------------------------------------------------------
create index if not exists idx_loan_files_user_id          on public.loan_files(user_id);
create index if not exists idx_loan_files_status            on public.loan_files(status);
create index if not exists idx_loan_files_closing_date      on public.loan_files(closing_date);
create index if not exists idx_loan_files_portal_token      on public.loan_files(portal_token);
create index if not exists idx_documents_loan_file_id       on public.documents(loan_file_id);
create index if not exists idx_documents_status             on public.documents(status);
create index if not exists idx_documents_type               on public.documents(type);
create index if not exists idx_conditions_loan_file_id      on public.conditions(loan_file_id);
create index if not exists idx_conditions_status            on public.conditions(status);
create index if not exists idx_lender_submissions_loan_id   on public.lender_submissions(loan_file_id);
create index if not exists idx_lender_submissions_by        on public.lender_submissions(submitted_by);
create index if not exists idx_messages_user_id             on public.messages(user_id);
create index if not exists idx_messages_loan_file_id        on public.messages(loan_file_id);
create index if not exists idx_messages_contact_id          on public.messages(contact_id);
create index if not exists idx_pulse_events_user_id         on public.pulse_events(user_id);
create index if not exists idx_pulse_events_contact_id      on public.pulse_events(contact_id);
create index if not exists idx_token_usage_user_id          on public.token_usage(user_id);
create index if not exists idx_contacts_user_id             on public.contacts(user_id);
create index if not exists idx_disclosures_loan_file_id     on public.disclosures(loan_file_id);
create index if not exists idx_loan_applications_loan_id    on public.loan_applications(loan_file_id);
