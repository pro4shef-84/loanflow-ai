-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  nmls_id text,
  phone text,
  subscription_tier text not null default 'trial' check (subscription_tier in ('trial','starter','pro','team')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CONTACTS
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('borrower','realtor','title','other')),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  property_value numeric,
  loan_balance numeric,
  note_rate numeric,
  loan_close_date date,
  last_contact_at timestamptz,
  pulse_active boolean default false,
  pulse_paused boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- LENDERS
create table public.lenders (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text check (type in ('wholesale','retail','portfolio','hard_money')),
  is_system boolean default false,
  created_at timestamptz not null default now()
);

-- Insert default lenders
insert into public.lenders (name, type, is_system) values
  ('UWM (United Wholesale Mortgage)', 'wholesale', true),
  ('Rocket Pro TPO', 'wholesale', true),
  ('PennyMac TPO', 'wholesale', true),
  ('Flagstar Wholesale', 'wholesale', true),
  ('NewRez Wholesale', 'wholesale', true),
  ('REMN Wholesale', 'wholesale', true),
  ('The Loan Store', 'wholesale', true),
  ('AFR Wholesale', 'wholesale', true);

-- LOAN FILES
create table public.loan_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  borrower_id uuid references public.contacts(id),
  lender_id uuid references public.lenders(id),
  file_number text,
  loan_type text not null check (loan_type in ('purchase','refinance','heloc','non_qm','va','fha','usda')),
  loan_purpose text check (loan_purpose in ('primary_residence','second_home','investment')),
  loan_amount numeric,
  property_address text,
  property_city text,
  property_state text,
  property_zip text,
  estimated_value numeric,
  status text not null default 'intake' check (status in ('intake','verification','submitted','in_underwriting','conditional_approval','clear_to_close','closed','withdrawn')),
  submission_readiness_score integer,
  readiness_breakdown jsonb,
  rate_lock_date date,
  rate_lock_expires_at date,
  closing_date date,
  portal_token text unique default encode(gen_random_bytes(32), 'hex'),
  portal_expires_at timestamptz default (now() + interval '120 days'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- DOCUMENTS
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  loan_file_id uuid references public.loan_files(id) on delete cascade not null,
  type text not null check (type in ('w2','pay_stub','bank_statement','tax_return_1040','schedule_c','schedule_e','purchase_contract','mortgage_statement','drivers_license','social_security','gift_letter','voe','appraisal','title_report','homeowners_insurance','hoa_statement','rental_agreement','conditional_approval','other')),
  status text not null default 'pending' check (status in ('pending','uploaded','processing','verified','needs_attention','rejected','expired')),
  file_path text,
  original_filename text,
  file_size_bytes integer,
  mime_type text,
  extracted_data jsonb,
  extraction_confidence numeric,
  verification_flags jsonb,
  required boolean default true,
  notes text,
  uploaded_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CONDITIONS
create table public.conditions (
  id uuid primary key default uuid_generate_v4(),
  loan_file_id uuid references public.loan_files(id) on delete cascade not null,
  source text not null check (source in ('lender','internal','title','appraisal')),
  lender_condition_text text,
  plain_english_summary text,
  required_document_type text,
  status text not null default 'open' check (status in ('open','borrower_notified','document_received','validated','submitted_to_lender','cleared','waived')),
  priority text default 'normal' check (priority in ('high','normal','low')),
  due_date date,
  document_id uuid references public.documents(id),
  borrower_task_sent_at timestamptz,
  validated_at timestamptz,
  cleared_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MESSAGES
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  loan_file_id uuid references public.loan_files(id) on delete cascade,
  contact_id uuid references public.contacts(id),
  user_id uuid references public.users(id) on delete cascade not null,
  channel text not null check (channel in ('sms','email','in_app')),
  direction text not null default 'outbound' check (direction in ('outbound','inbound')),
  recipient_type text check (recipient_type in ('borrower','realtor','title','lo')),
  recipient_email text,
  recipient_phone text,
  subject text,
  content text not null,
  status text default 'draft' check (status in ('draft','approved','sending','sent','delivered','failed')),
  trigger_type text,
  external_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- LENDER SUBMISSIONS
create table public.lender_submissions (
  id uuid primary key default uuid_generate_v4(),
  loan_file_id uuid references public.loan_files(id) on delete cascade not null,
  lender_id uuid references public.lenders(id) not null,
  submitted_by uuid references public.users(id) not null,
  submission_type text check (submission_type in ('initial','conditions','resubmission')),
  status text default 'submitted' check (status in ('preparing','submitted','acknowledged','conditions_issued','cleared')),
  lender_loan_number text,
  documents_included jsonb,
  notes text,
  submitted_at timestamptz default now(),
  updated_at timestamptz not null default now()
);

-- PULSE EVENTS
create table public.pulse_events (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  event_type text not null check (event_type in ('rate_drop','equity_trigger','loan_anniversary','listing_activity','manual')),
  event_data jsonb,
  reasoning text,
  action_taken text check (action_taken in ('nudge_sent','dismissed','snoozed','pending')),
  message_id uuid references public.messages(id),
  detected_at timestamptz default now(),
  actioned_at timestamptz
);

-- TOKEN USAGE (cost monitoring)
create table public.token_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  loan_file_id uuid references public.loan_files(id) on delete set null,
  module text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.loan_files enable row level security;
alter table public.documents enable row level security;
alter table public.conditions enable row level security;
alter table public.messages enable row level security;
alter table public.lender_submissions enable row level security;
alter table public.pulse_events enable row level security;
alter table public.token_usage enable row level security;
alter table public.lenders enable row level security;

-- RLS POLICIES
create policy "Users can manage own profile" on public.users for all using (auth.uid() = id);
create policy "Users can manage own contacts" on public.contacts for all using (auth.uid() = user_id);
create policy "Users can manage own loan files" on public.loan_files for all using (auth.uid() = user_id);
create policy "Users can manage own documents" on public.documents for all using (auth.uid() = (select user_id from public.loan_files where id = loan_file_id));
create policy "Users can manage own conditions" on public.conditions for all using (auth.uid() = (select user_id from public.loan_files where id = loan_file_id));
create policy "Users can manage own messages" on public.messages for all using (auth.uid() = user_id);
create policy "Users can manage own submissions" on public.lender_submissions for all using (auth.uid() = submitted_by);
create policy "Users can manage own pulse events" on public.pulse_events for all using (auth.uid() = user_id);
create policy "Users can view own token usage" on public.token_usage for select using (auth.uid() = user_id);
create policy "Lenders are public read" on public.lenders for select using (true);

-- Borrower portal access (no auth — token based)
create policy "Portal token read access for loan files" on public.loan_files for select using (true);
create policy "Portal token read/write for documents" on public.documents for all using (true);

-- UPDATED_AT TRIGGER
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_users_updated before update on public.users for each row execute function update_updated_at();
create trigger trg_contacts_updated before update on public.contacts for each row execute function update_updated_at();
create trigger trg_loan_files_updated before update on public.loan_files for each row execute function update_updated_at();
create trigger trg_documents_updated before update on public.documents for each row execute function update_updated_at();
create trigger trg_conditions_updated before update on public.conditions for each row execute function update_updated_at();
create trigger trg_submissions_updated before update on public.lender_submissions for each row execute function update_updated_at();
