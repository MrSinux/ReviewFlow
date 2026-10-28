-- RBAC table for ReviewFlow
-- Run this in Supabase SQL Editor after creating your core tables.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super', 'admin', 'user')),
  business_id uuid references public.businesses(id) on delete set null,
  business_slug text,
  created_at timestamptz not null default now()
);

-- Enable row level security (RLS)
alter table public.user_profiles enable row level security;

-- Helper function to avoid RLS policy recursion.
-- SECURITY DEFINER bypasses RLS on user_profiles, so it can be safely used in policies.
create or replace function public.is_super(p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = p_uid and role = 'super'
  );
$$;

-- Users can read their own profile
drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile"
on public.user_profiles for select
to authenticated
using (id = auth.uid());

-- Super can read all profiles (no recursion thanks to is_super())
drop policy if exists "super read all profiles" on public.user_profiles;
create policy "super read all profiles"
on public.user_profiles for select
to authenticated
using (public.is_super(auth.uid()));

-- Allow inserting own profile row (mostly useful for controlled server-side flows)
drop policy if exists "insert own profile" on public.user_profiles;
create policy "insert own profile"
on public.user_profiles for insert
to authenticated
with check (id = auth.uid());
