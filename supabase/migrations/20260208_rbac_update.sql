-- RBAC update migration (super/admin/user) + fix RLS recursion

-- If you previously used a different role label, normalize it first.
update public.user_profiles
set role = 'admin'
where role = 'business_admin';

-- Drop existing role check constraints (name may vary)
do $$
declare
  c record;
begin
  for c in
    select oid, conname
    from pg_constraint
    where conrelid = 'public.user_profiles'::regclass
      and contype = 'c'
  loop
    -- Drop only constraints that mention the role column.
    if exists (
      select 1
      from pg_get_constraintdef(c.oid) as def
      where def like '%role%'
    ) then
      execute format('alter table public.user_profiles drop constraint if exists %I', c.conname);
    end if;
  end loop;
end $$;

-- Re-add the role check constraint
alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('super','admin','user'));

-- Replace the recursive "super read all profiles" policy with a safe SECURITY DEFINER helper.
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

alter table public.user_profiles enable row level security;

drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile"
on public.user_profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "super read all profiles" on public.user_profiles;
create policy "super read all profiles"
on public.user_profiles for select
to authenticated
using (public.is_super(auth.uid()));

drop policy if exists "insert own profile" on public.user_profiles;
create policy "insert own profile"
on public.user_profiles for insert
to authenticated
with check (id = auth.uid());
