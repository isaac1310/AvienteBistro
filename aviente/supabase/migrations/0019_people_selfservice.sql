-- People manage themselves in — the dashboard stops being a per-person stop.
--
-- Until now adding a person was a two-step dashboard ceremony: invite the email in
-- Authentication, then INSERT the family_members row by hand (docs/ADDING-A-PERSON.md).
-- The app's People page could never replace that, because signing in cannot create an
-- account while "Allow new users to sign up" is off, and turning it on made
-- signInWithOtp an open door for any stranger with an email address.
--
-- Supabase's "Before User Created" auth hook (supabase/auth v2.175.0, 2025-06) closes
-- that hole from inside the database: a function that runs BEFORE every account
-- insert and may refuse it. So the gate moves from "signup off" to "signup on, but a
-- doorman checks the list" — and the list is family_members.email, which the People
-- page edits. No service key anywhere, no Edge Function, no per-person dashboard
-- visit. ONE dashboard visit remains, at setup: Authentication → Hooks → point
-- "Before User Created" at public.before_user_created. That toggle cannot be set by
-- SQL, and until it is set, signups must stay OFF or the door stands open. The order
-- is stated in docs/ADDING-A-PERSON.md.
--
-- Verified against the GoTrue source before relying on it: the hook fires for
-- magic-link/OTP signups, for password signups, for OAuth, AND for admin invites —
-- so the dashboard invite path keeps working, it just stops being required. It runs
-- before the row exists and its refusal aborts the request; there is no window in
-- which an account was half-created.

-- ── the list ────────────────────────────────────────────────────────────────
-- Nullable: credit-only people (Savta) have no email, exactly as they have no
-- user_id. Unique because an email can only let ONE person in. Stored lowercase —
-- the app normalises on write, and every comparison below lowers both sides anyway,
-- so a row edited by hand in the SQL editor still matches.
alter table family_members
  add column if not exists email text unique;

comment on column family_members.email is
  'The address allowed to sign in as this person. Null = credit-only, no login.';

-- ── the doorman ─────────────────────────────────────────────────────────────
-- Contract per the auth-hooks docs: takes the event as jsonb, returns '{}' to allow,
-- or {"error": {...}} to refuse. The refusal message reaches the login form as an
-- ordinary auth error, so it is written for the person who typed the email, not for
-- a log file.
create or replace function public.before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from family_members
    where lower(email) = lower(event->'user'->>'email')
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email is not on the family list. Ask Itzik to add you, then try again.'
    )
  );
end;
$$;

-- The hook is called by the auth server's role and by nobody else. Without the
-- grant, every signup fails; without the revokes, any signed-in member could probe
-- the list by calling the function directly.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.before_user_created(jsonb) from public, anon, authenticated;

-- ── the link, in both directions ────────────────────────────────────────────
-- A person row and an auth account meet by email, whichever arrives first.
--
-- Direction 1: the account arrives second (the normal flow — admin adds the person,
-- they sign in later). Fired from auth.users, so it runs however the account was
-- born: self-service magic link, dashboard invite, or dashboard "add user".
create or replace function public.link_member_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update family_members
  set user_id = new.id
  where lower(email) = lower(new.email)
    and user_id is null;
  return new;
end;
$$;

drop trigger if exists link_member_on_signup on auth.users;
create trigger link_member_on_signup
  after insert on auth.users
  for each row execute function public.link_member_on_signup();

-- Direction 2: the account arrives first (Moran and Itzik already have accounts; a
-- future person might too, if the admin typo-fixes an email after they signed in
-- once). Fired from family_members when an email is set, and reads auth.users —
-- which only works as security definer, which is the point: the app itself is never
-- allowed to read the accounts table.
create or replace function public.link_member_on_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null and new.user_id is null then
    select u.id into new.user_id
    from auth.users u
    where lower(u.email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists link_member_on_email on family_members;
create trigger link_member_on_email
  before insert or update of email on family_members
  for each row execute function public.link_member_on_email();

-- ── backfill ────────────────────────────────────────────────────────────────
-- The two existing accounts get their emails written onto their rows, so the
-- doorman knows them and the People page shows the truth from day one.
update family_members m
set email = lower(u.email)
from auth.users u
where m.user_id = u.id
  and m.email is null;

insert into schema_migrations (version, name) values (19, 'people_selfservice')
on conflict (version) do nothing;
