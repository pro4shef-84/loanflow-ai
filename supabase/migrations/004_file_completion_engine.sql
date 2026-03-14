-- =============================================================================
-- Migration 004: File Completion Engine
-- Adds: document_requirements, escalations, review_decisions,
--        document_reminders, file_completion_events tables
-- Modifies: loan_files (adds doc_workflow_state), documents (adds AI fields)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: document_requirements
-- AI-generated checklist items per loan file
-- -----------------------------------------------------------------------------
create table if not exists public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  loan_file_id uuid not null references public.loan_files(id) on delete cascade,
  doc_type text not null,
  state text not null default 'required',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TABLE: escalations
-- Issues requiring officer attention
-- -----------------------------------------------------------------------------
create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(),
  loan_file_id uuid not null references public.loan_files(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  category text not null,
  severity text not null default 'info',
  status text not null default 'open',
  owner_id uuid references public.users(id),
  description text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TABLE: review_decisions
-- Officer review audit trail
-- -----------------------------------------------------------------------------
create table if not exists public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  loan_file_id uuid not null references public.loan_files(id) on delete cascade,
  user_id uuid not null references public.users(id),
  decision text not null check (decision in ('review_ready', 'needs_correction', 'archived')),
  notes text,
  document_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TABLE: document_reminders
-- Track reminder cadence for document requests
-- -----------------------------------------------------------------------------
create table if not exists public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  loan_file_id uuid not null references public.loan_files(id) on delete cascade,
  requirement_id uuid references public.document_requirements(id) on delete cascade,
  reminder_number integer not null default 1,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TABLE: file_completion_events
-- Audit trail for the file completion engine
-- -----------------------------------------------------------------------------
create table if not exists public.file_completion_events (
  id uuid primary key default gen_random_uuid(),
  loan_file_id uuid references public.loan_files(id) on delete cascade,
  event_type text not null,
  actor text not null default 'system',
  payload jsonb default '{}',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ALTER: loan_files — add file completion fields (parallel to existing status)
-- -----------------------------------------------------------------------------
alter table public.loan_files add column if not exists doc_workflow_state text default 'checklist_pending';
alter table public.loan_files add column if not exists checklist_generated_at timestamptz;
alter table public.loan_files add column if not exists employment_type text default 'w2';

-- -----------------------------------------------------------------------------
-- ALTER: documents — add file completion engine fields
-- -----------------------------------------------------------------------------
alter table public.documents add column if not exists requirement_id uuid references public.document_requirements(id) on delete set null;
alter table public.documents add column if not exists confidence_score numeric(4,3);
alter table public.documents add column if not exists ai_rationale text;
alter table public.documents add column if not exists issues jsonb default '[]';
alter table public.documents add column if not exists classification_raw jsonb;
alter table public.documents add column if not exists validated_at timestamptz;
alter table public.documents add column if not exists superseded_by uuid references public.documents(id);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_doc_requirements_loan_file_id on public.document_requirements(loan_file_id);
create index if not exists idx_doc_requirements_state on public.document_requirements(state);
create index if not exists idx_doc_requirements_doc_type on public.document_requirements(doc_type);
create index if not exists idx_escalations_loan_file_id on public.escalations(loan_file_id);
create index if not exists idx_escalations_status on public.escalations(status);
create index if not exists idx_escalations_severity on public.escalations(severity);
create index if not exists idx_escalations_category on public.escalations(category);
create index if not exists idx_review_decisions_loan_file_id on public.review_decisions(loan_file_id);
create index if not exists idx_document_reminders_loan_file_id on public.document_reminders(loan_file_id);
create index if not exists idx_document_reminders_requirement_id on public.document_reminders(requirement_id);
create index if not exists idx_file_completion_events_loan_file_id on public.file_completion_events(loan_file_id);
create index if not exists idx_file_completion_events_event_type on public.file_completion_events(event_type);
create index if not exists idx_documents_requirement_id on public.documents(requirement_id);
create index if not exists idx_documents_confidence_score on public.documents(confidence_score);
create index if not exists idx_loan_files_doc_workflow_state on public.loan_files(doc_workflow_state);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.document_requirements enable row level security;
alter table public.escalations enable row level security;
alter table public.review_decisions enable row level security;
alter table public.document_reminders enable row level security;
alter table public.file_completion_events enable row level security;

-- All new tables: user can access via loan_files ownership
create policy "user_doc_requirements" on public.document_requirements
  for all using (exists (
    select 1 from public.loan_files
    where loan_files.id = document_requirements.loan_file_id
      and loan_files.user_id = auth.uid()
  ));

create policy "user_escalations" on public.escalations
  for all using (exists (
    select 1 from public.loan_files
    where loan_files.id = escalations.loan_file_id
      and loan_files.user_id = auth.uid()
  ));

create policy "user_review_decisions" on public.review_decisions
  for all using (exists (
    select 1 from public.loan_files
    where loan_files.id = review_decisions.loan_file_id
      and loan_files.user_id = auth.uid()
  ));

create policy "user_document_reminders" on public.document_reminders
  for all using (exists (
    select 1 from public.loan_files
    where loan_files.id = document_reminders.loan_file_id
      and loan_files.user_id = auth.uid()
  ));

create policy "user_file_completion_events" on public.file_completion_events
  for all using (exists (
    select 1 from public.loan_files
    where loan_files.id = file_completion_events.loan_file_id
      and loan_files.user_id = auth.uid()
  ));

-- -----------------------------------------------------------------------------
-- TRIGGERS: updated_at
-- -----------------------------------------------------------------------------
create trigger trg_doc_requirements_updated
  before update on public.document_requirements
  for each row execute function update_updated_at();

create trigger trg_escalations_updated
  before update on public.escalations
  for each row execute function update_updated_at();
