-- ============================================================
-- 006_templates.sql
-- Message template library for reusable LO communications
-- ============================================================

create table if not exists message_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  category    text not null default 'general',
  channel     text not null check (channel in ('sms', 'email', 'both')) default 'both',
  subject     text,              -- email subject line
  body        text not null,     -- template body with {{variables}}
  variables   text[] default '{}', -- list of variable names used
  is_default  boolean default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table message_templates enable row level security;

create policy "Users can manage their own templates"
  on message_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Index for fast lookup
create index idx_message_templates_user_id on message_templates(user_id);
create index idx_message_templates_category on message_templates(user_id, category);

-- Seed default templates for new users (inserted by API on first load)
-- These are just stored — not auto-inserted via trigger.

comment on table message_templates is 'Reusable message templates with variable substitution for LO communications';
