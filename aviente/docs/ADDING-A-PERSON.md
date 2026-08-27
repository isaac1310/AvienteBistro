# Adding a person to Aviente

Written before it is needed, because the next time it is done it will be under time
pressure — someone standing in the kitchen wanting to see a recipe.

## Since v11.2.0: it is one step, in the app

**Settings → People → Add a person.** Name, alias, email, role. Done.

Then send them the app's address. They type their email on the login screen, get the
magic link, and are in — account created, linked to their row, greeted by name. No
dashboard, no SQL, no invitation email to send.

Under the hood (migration `0019_people_selfservice.sql`), because knowing the
mechanism is what makes the failure modes obvious:

- Public signup is **ON**, but every new account passes a doorman first: the
  `before_user_created` auth hook, a database function that refuses any email that
  has no `family_members` row. The People page edits that list. A stranger typing
  their email gets "This email is not on the family list."
- A trigger links the account to the person row by email — in both directions, so
  it does not matter whether the row or the account exists first.
- Access is still conferred by the ROW, not the account (`is_family()`, migration
  0001). An orphaned auth account with no row sees an empty app.

## One-time setup — the order matters

The hook must be attached before signup is enabled, or the door stands open between
the two clicks:

1. Apply `0019_people_selfservice.sql` (SQL editor). Take a backup first.
2. Dashboard → **Authentication → Hooks → Before User Created** → Postgres function
   → `public.before_user_created` → enable.
3. Only now: **Authentication → Sign In / Up → Allow new users to sign up → ON.**

To verify: try to sign in with an email that is not on the People list. The login
screen must answer "not on the family list", not "check your email".

## What `role` decides

`admin` sees the People page and the backup section in Settings; `member` does not.
The pages check the role server-side as well, so hiding the cards is a courtesy, not
the gate. Two people can hold `admin`; nothing requires exactly one.

## Credit-only people

Savta, Saba, אורח and בייביסיטר are rows with no email and no account. They can be
named as the cook of a dish and can never sign in. Add one on the People page by
leaving the email empty. That is the whole mechanism; there is no separate flag.

## Before inviting anyone outside the two of you

**The repository must be private first.** The pushed history contains the recipe book
and the photographs. They are untracked going forward, but untracking is not
retraction — only making the repo private stops what is already there being fetched.

## Removing someone

**Settings → People → open the person → Remove access.** This clears their account
link AND their email — both must go, or their next magic link would let them
straight back in. Their name stays on every recipe they are credited on, which is
why there is no delete button: `recipes.source_member_id` is `on delete set null`,
so deleting a row silently erases attribution. A person can lose their login, never
their existence.

Their auth account keeps existing in Supabase and grants nothing (no row, no
membership). Tidy it in the dashboard if you care, or leave it.

## The old way still works

The dashboard invite (**Authentication → Users → Add user → Send invitation**) still
functions — the hook allows any email on the People list, invites included, and the
trigger links the account the same way. It is the fallback if the app is ever the
thing that is broken.
