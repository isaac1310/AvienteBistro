# Adding a person to Aviente

Written before it was needed, because the next time it is done it will be under time
pressure — someone standing in the kitchen wanting to see a recipe.

## It is two steps, not one

**Adding a Supabase auth user gets somebody past the login screen and nothing more.**

Every policy in this database is gated on `is_family()` (migration 0001), which is:

```sql
select exists (select 1 from family_members where user_id = auth.uid())
```

So access is conferred by a ROW IN `family_members`, not by having an account. A new
person with an auth user and no row signs in successfully and then sees an app with no
recipes, no menus and no greeting — indistinguishable, from their side, from the app
being broken. `currentMember()` returns null for them exactly as it does for a
stranger, and that is deliberate: an account is not membership.

### 1 · The auth user

Supabase dashboard → **Authentication → Users → Add user → Send invitation**, with
their email. Public signup is OFF in the dashboard, on purpose: `signInWithOtp` cannot
create an account, so the login screen can never be a back door.

### 2 · The family member row

```sql
insert into family_members (name, display_name, user_id, role, language, theme)
values (
  'Name',                  -- how they are recorded
  'Alias',                 -- how the app greets them: "Mama", "Papa"
  '<the auth user id>',     -- from the Users table; THIS is what grants access
  'member',                -- or 'admin' — see below
  'he',                    -- 'he' or 'en'
  'garden'                 -- or 'burgundy'
);
```

Then have them open the app and sign in. Nothing else is needed; no cache clearing, no
deploy.

## What `role` decides

`admin` sees the backup section in Settings — the JSON export, the photo zip, and the
restore door. `member` does not, and the routes check the role server-side as well, so
hiding the section is a door rather than a curtain.

Two people can hold `admin`. Nothing in the app requires exactly one.

## Credit-only people

Savta, Saba, אורח (Guest) and בייביסיטר (Babysitter) are `family_members` rows with
`user_id` **null**. They can be named as the cook of a dish or the source of a recipe,
and they can never sign in — because `is_family()` matches on `user_id`, and a null
matches nobody. That is the whole mechanism; there is no separate flag.

Add one with the same insert, leaving `user_id` out.

## Before inviting anyone outside the two of you

**The repository must be private first.** The pushed history contains the recipe book
and the photographs. They are untracked going forward, but untracking is not
retraction — only making the repo private stops what is already there being fetched.

## Removing someone

Delete their `family_members` row. That revokes access immediately and everywhere,
because every policy re-evaluates `is_family()` on every query. Their auth user can
stay or go; without the row it grants nothing.

Do NOT delete the row if they are credited on recipes you want to keep credited:
`recipes.source_member_id` is `on delete set null`, so the attribution quietly
disappears. Set `user_id` to null instead — that turns them into a credit-only person
and keeps every "Savta's recipe" line intact.
