-- ReviewFlow v7 DB changes (formerly SUPABASE_V7_SQL.sql at the repo root)
-- Adds: feedback.status = flagged, reply logging table feedback_replies, and last reply fields.

-- 0) Enable uuid generation if not already enabled (Supabase usually has this)
create extension if not exists pgcrypto;

-- 1) Ensure feedback.status supports flagged (and keeps existing statuses)
alter table public.feedback
  alter column status set default 'new';

alter table public.feedback
  drop constraint if exists feedback_status_check;

alter table public.feedback
  add constraint feedback_status_check
  check (status in ('new','reviewed','resolved','flagged','spam'));

-- 2) Create reply audit table
create table if not exists public.feedback_replies (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,

  to_email text not null,
  subject text null,
  body text not null,

  provider text not null default 'resend',
  provider_message_id text null,

  sent_by_user_id uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_replies_feedback_id
  on public.feedback_replies(feedback_id);

create index if not exists idx_feedback_replies_business_id
  on public.feedback_replies(business_id);

-- 3) (Optional but recommended) store last-reply fields on feedback
alter table public.feedback
  add column if not exists last_reply_at timestamptz null,
  add column if not exists last_reply_to text null;

-- 4) Speed up inbox filters/counts
create index if not exists idx_feedback_business_status_created
  on public.feedback (business_id, status, created_at desc);
