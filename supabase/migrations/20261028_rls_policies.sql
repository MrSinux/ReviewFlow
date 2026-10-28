-- ReviewFlow row level security for the app tables.
-- Run after schema.sql, rbac.sql and migrations/20260429_feedback_replies.sql.
--
-- Written from how the app uses each table (the policies used in production were managed in the
-- Supabase dashboard and never committed):
--   anon (public review pages): read a business, record a rating, submit feedback
--   admin: read and manage their own business's data
--   super: everything
--   send-feedback-reply Edge Function: uses the service role, which bypasses RLS

-- The business an admin belongs to (null for anyone else). SECURITY DEFINER so policies can read
-- user_profiles without recursing into that table's own RLS (same pattern as is_super()).
create or replace function public.admin_business_id(p_uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.user_profiles where id = p_uid and role = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
alter table public.businesses enable row level security;

-- Public review pages load a business by slug before anyone signs in.
drop policy if exists "anyone can read businesses" on public.businesses;
create policy "anyone can read businesses"
on public.businesses for select
to anon, authenticated
using (true);

-- Saving uses an upsert, so the INSERT check also applies when an admin saves their own business.
-- Only a super admin can create a genuinely new business.
drop policy if exists "super or own admin can insert businesses" on public.businesses;
create policy "super or own admin can insert businesses"
on public.businesses for insert
to authenticated
with check (
  public.is_super((select auth.uid()))
  or id = public.admin_business_id((select auth.uid()))
);

drop policy if exists "super or own admin can update businesses" on public.businesses;
create policy "super or own admin can update businesses"
on public.businesses for update
to authenticated
using (
  public.is_super((select auth.uid()))
  or id = public.admin_business_id((select auth.uid()))
)
with check (
  public.is_super((select auth.uid()))
  or id = public.admin_business_id((select auth.uid()))
);

drop policy if exists "super can delete businesses" on public.businesses;
create policy "super can delete businesses"
on public.businesses for delete
to authenticated
using (public.is_super((select auth.uid())));

-- The settings page lets only a super admin change a business's identity and branding.
-- Enforce that server-side too, so a business admin cannot bypass the UI.
create or replace function public.guard_business_admin_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super(auth.uid()) then
    if new.name is distinct from old.name
       or new.slug is distinct from old.slug
       or new.status is distinct from old.status
       or new.google_review_url is distinct from old.google_review_url
       or (old.theme is not null and new.theme is distinct from old.theme) then
      raise exception 'Only a super admin can change the name, slug, status, Google review URL or theme of a business'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_business_admin_update on public.businesses;
create trigger guard_business_admin_update
before update on public.businesses
for each row execute function public.guard_business_admin_update();

-- ---------------------------------------------------------------------------
-- rating_events
-- ---------------------------------------------------------------------------
alter table public.rating_events enable row level security;

-- Every star tap on a public page is recorded. IDs are generated client-side, so the
-- insert never needs to read the row back.
drop policy if exists "anyone can record a rating" on public.rating_events;
create policy "anyone can record a rating"
on public.rating_events for insert
to anon, authenticated
with check (true);

drop policy if exists "super or own admin can read rating events" on public.rating_events;
create policy "super or own admin can read rating events"
on public.rating_events for select
to authenticated
using (
  public.is_super((select auth.uid()))
  or business_id = public.admin_business_id((select auth.uid()))
);

drop policy if exists "super can delete rating events" on public.rating_events;
create policy "super can delete rating events"
on public.rating_events for delete
to authenticated
using (public.is_super((select auth.uid())));

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
alter table public.feedback enable row level security;

-- Customers below the threshold submit private feedback. New rows must start unread and
-- without reply fields.
drop policy if exists "anyone can submit feedback" on public.feedback;
create policy "anyone can submit feedback"
on public.feedback for insert
to anon, authenticated
with check (status = 'new' and last_reply_at is null and last_reply_to is null);

-- Reads also gate Supabase Realtime: the inbox and sidebar badge only receive changes for rows
-- the signed-in user can select.
drop policy if exists "super or own admin can read feedback" on public.feedback;
create policy "super or own admin can read feedback"
on public.feedback for select
to authenticated
using (
  public.is_super((select auth.uid()))
  or business_id = public.admin_business_id((select auth.uid()))
);

drop policy if exists "super or own admin can update feedback" on public.feedback;
create policy "super or own admin can update feedback"
on public.feedback for update
to authenticated
using (
  public.is_super((select auth.uid()))
  or business_id = public.admin_business_id((select auth.uid()))
)
with check (
  public.is_super((select auth.uid()))
  or business_id = public.admin_business_id((select auth.uid()))
);

drop policy if exists "super or own admin can delete feedback" on public.feedback;
create policy "super or own admin can delete feedback"
on public.feedback for delete
to authenticated
using (
  public.is_super((select auth.uid()))
  or business_id = public.admin_business_id((select auth.uid()))
);

-- ---------------------------------------------------------------------------
-- feedback_replies (written only by the send-feedback-reply Edge Function's service role)
-- ---------------------------------------------------------------------------
alter table public.feedback_replies enable row level security;

drop policy if exists "super or own admin can read replies" on public.feedback_replies;
create policy "super or own admin can read replies"
on public.feedback_replies for select
to authenticated
using (
  public.is_super((select auth.uid()))
  or business_id = public.admin_business_id((select auth.uid()))
);

drop policy if exists "super can delete replies" on public.feedback_replies;
create policy "super can delete replies"
on public.feedback_replies for delete
to authenticated
using (public.is_super((select auth.uid())));

-- ---------------------------------------------------------------------------
-- user_profiles: "Delete business" also removes the business's profiles.
-- ---------------------------------------------------------------------------
drop policy if exists "super can delete profiles" on public.user_profiles;
create policy "super can delete profiles"
on public.user_profiles for delete
to authenticated
using (public.is_super((select auth.uid())));
