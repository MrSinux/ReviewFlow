-- ReviewFlow - core Supabase schema
-- Run this first in the Supabase SQL Editor, then rbac.sql, then migrations/20260429_feedback_replies.sql.

-- Extensions
create extension if not exists "pgcrypto";

-- Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Businesses (client configs)
create table if not exists public.businesses (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  threshold_rating int not null default 4 check (threshold_rating between 1 and 5),
  google_review_url text not null default '',
  redirect_url text,
  entry_points jsonb,
  feedback_questions jsonb,
  theme jsonb,
  contact_settings jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_slug on public.businesses (slug);

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

-- Rating events (recent activity / scan events)
create table if not exists public.rating_events (
  id uuid not null default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  src text,
  was_redirected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_rating_events_business_id_created_at on public.rating_events (business_id, created_at desc);

-- Feedback (inbox)
create table if not exists public.feedback (
  id uuid not null default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  answers jsonb,
  name text,
  email text,
  photos text[],
  rating_event_id uuid references public.rating_events(id) on delete set null,
  src text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_business_id_created_at on public.feedback (business_id, created_at desc);
create index if not exists idx_feedback_status on public.feedback (status);

-- The business inbox and sidebar badge subscribe to feedback changes via Supabase Realtime.
alter publication supabase_realtime add table public.feedback;
