# Your side — the things Claude can't do

Dashboard clicks, accounts, and secrets. Everything else is in `CHECKLIST.md`.

**What is actually required, and what is a choice.** Only one item here is
unavoidable:

| Item | Why | Skippable? |
|---|---|---|
| **5 · keys** | the app cannot find the database without its address | **No.** ~3 min, and nothing works before it |
| 1, 3, 4 · auth | stops strangers writing in the cookbook | Only by dropping accounts entirely — see below |
| 6 · verify | confirms the seed landed | Yes, but it's four copy-pastes |
| 7 · dev project | so tests never delete real recipes | Only if you drop the pre-PR regression suite |
| 8, 9, 10 · deploy | so Moran can open it on her phone | Yes, until you want that |

If the auth steps feel like too much ceremony for two people, **TravelHub's model
is still available**: no accounts at all, one secret link, which deletes items 1,
3, 4 and most of 8 permanently. The cost is photos — with nobody logged in,
Supabase Storage can't tell family from stranger, so the photo bucket goes public
or needs a proxy route written. Say the word and it's an hour's change, cleanest
before any real recipes are photographed.

- [x] **1 · Public signup OFF** — Auth → Sign In / Providers → Email.
- [x] **2 · Four SQL files run** — `0001`, `0002`, `0003`, `seed.sql`.
- [x] **3 · Two users created** — you and Moran, both Auto Confirm.
- [ ] **5 · Keys into `.env.local`** — unblocks all my remaining work
- [x] **4 · Link accounts to family members**
- [ ] **6 · Verify the seed**
- [ ] **7 · Redirect URLs** — domain exists now, do it
- [ ] **8 · Fix the Vercel deployment** — root directory + env vars
- [ ] **9 · Flip the repo private**

---

## 4 · Link the accounts to the family members

SQL Editor. The seed created Itzik, Moran, Savta and Saba as **credit records**;
this attaches the two that can actually log in.

```sql
update family_members m set user_id = u.id
from auth.users u
where (m.name, u.email) in (
  ('Itzik', 'issacavineta@gmail.com'),
  ('Moran', 'moran@example.com')          -- ← Moran's real email
);

select name, display_name, user_id is not null as can_log_in
from family_members order by name;
```

**Expect:** Itzik and Moran `true`; Savta and Saba `false` — they get credited on
recipes without ever having an account.

Don't have Moran's email to hand? Run it with only the Itzik line and add hers
later. Nothing downstream is blocked by it.

## 5 · Keys into `.env.local`  ← the one that unblocks me

**What this is, in plain words.** The app is on your laptop. Your recipes are on
Supabase's server. Right now the app has no idea where that server is or how to
knock on its door. You're about to write its address and its doorbell into a small
text file that lives next to the app and never leaves your machine.

Two values. The **URL** is the address. The **anon key** is the doorbell — it lets
the app knock, but not walk in; who gets in is decided by the rules already
installed in the database.

This does **not** need the Vercel domain. Do it now.

### 5a · Open the page with the values on it

1. Go to your project on [supabase.com](https://supabase.com).
2. Bottom-left, click the **gear icon** (Project Settings).
3. In the left menu click **API Keys**. (On some accounts it's just **API** —
   same page.)

### 5b · Copy the address

Supabase has renamed this more than once. Any of these labels is the same thing:

- **API URL** — "RESTful endpoint for querying and managing your database" ← current
- **Project URL** — older wording

It looks like `https://abcdefghijklm.supabase.co`. Copy it somewhere you can get
it back — a Notes window is fine.

### 5c · Copy the doorbell

The key names changed too, so match on the **column heading**, not on how the key
looks:

| Label on the page | Starts with | Use it? | Goes in |
|---|---|---|---|
| **Publishable key** *(current)* | `sb_publishable_` | ✅ | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **`anon` / public** *(older)* | `eyJ` | ✅ | same line |
| **Secret key** *(current)* | `sb_secret_` | ❌ | nowhere |
| **`service_role`** *(older)* | `eyJ` | ❌ | nowhere |

Newer projects have no `eyJ...` key at all, so don't go looking for one.

> ⚠️ **Never copy the Secret / `service_role` key into this file.** It ignores
> every security rule in the database — every policy we installed, bypassed. It
> doesn't belong here, doesn't belong in Vercel, and don't paste it into a chat
> with me.
>
> The test-database key in step 7 is the one exception, and it's a *different*
> project holding throwaway data.

### 5d · Make the file

Open Terminal and paste this one line, then press Enter:

```bash
cp ~/Documents/Recipes/aviente/.env.example ~/Documents/Recipes/aviente/.env.local
```

Nothing will appear to happen. That's correct — it quietly made a copy called
`.env.local`, which is the real file. (The `.example` one is just a template, and
the name starts with a dot so Finder hides it.)

### 5e · Open the file

```bash
open -a TextEdit ~/Documents/Recipes/aviente/.env.local
```

TextEdit will open with a few lines of text and some comments.

### 5f · Paste the two values in

Find these two lines and put your values immediately after the `=`, with **no
spaces** and **no quotes**:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...the long string...
```

Then find this line and add `1`:

```
NEXT_PUBLIC_E2E=1
```

Leave `SUPABASE_SERVICE_ROLE_KEY=` **empty**. Yes, really — nothing needs it yet.

Common mistakes, all of which fail silently:
- quotes around a value → remove them
- a space after the `=` → remove it
- the URL ending in a `/` → remove the slash
- pasting the `secret` key into the `ANON_KEY` line → wrong key, go back to 5c

### 5g · Save and close

**⌘S**, then close TextEdit.

### 5h · Restart the app

If the dev server is running, stop it with **Ctrl+C** in its Terminal window, then:

```bash
cd ~/Documents/Recipes/aviente && npm run dev
```

A file like this is only read when the server starts, so without a restart nothing
changes and it looks like you did it wrong.

### 5i · Check it worked

Open http://localhost:3000 and look at the small grey line under the header. It
currently says the counts are hard-coded. Once I've wired the database that line
goes away — but for now, the thing to confirm is simply that **the page still
loads and there's no red error screen**.

If you see an error mentioning `supabaseUrl` or `Invalid API key`, one of the two
values is wrong or has a stray space. Tell me the error text and I'll pin it down.

**Then tell me it's done** — that's my cue to wire the app to the database.

## 6 · Verify the seed

```sql
select category, count(*) from recipes where deleted_at is null group by 1 order by 2 desc;
-- expect: breads 5, desserts 5, mains 1, soups 1, other 1

-- the hard parser cases survived the round-trip
select r.title, i.amount, i.amount_max, i.unit, i.name
from recipes r join ingredients i on i.recipe_id = r.id
where i.amount_max is not null or i.unit in ('cup','pinch') limit 8;

select title from recipes where search_text ilike '%קמח%';   -- trigger built the index
select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;  -- all true
```

If `breads` is 5, the whole category reconciliation worked. If `rowsecurity` is
false anywhere, tell me — that's a hole.

## 7 · A second Supabase project, for tests

The regression suite deletes rows. It must never point at the project holding the
real recipes.

1. New project, name it **`aviente-dev`** (the free tier allows two).
2. Run `0001`, `0002`, `0003` and `seed.sql` against it as well.
3. Add to `.env.local`:
   ```
   SUPABASE_DEV_URL=https://<dev-ref>.supabase.co
   SUPABASE_DEV_SERVICE_ROLE_KEY=<dev project's service role key>
   ```
   The service-role key **is** wanted here — this one is local-only tooling, never
   deployed. `npm run test:clean` removes any `__test__` fixture a crashed run leaves behind. (An earlier `test:reset` that truncated tables was removed: there is one database and it holds the family's only copy of these recipes.) It refuses to run unless the ref looks like a dev
   database, precisely because it deletes everything.

## 7 · Redirect URLs  ← do this now, the domain exists

Your production domain is **`https://aviente-bistro.vercel.app`**.

Supabase → **Authentication** → **URL Configuration**:

1. **Site URL** — paste exactly:
   ```
   https://aviente-bistro.vercel.app
   ```
   No trailing slash.
2. **Redirect URLs** — click *Add URL* twice and add both:
   ```
   https://aviente-bistro.vercel.app/**
   http://localhost:3000/**
   ```
   The `/**` matters: it means "any page on this site". Without it the magic link
   has nowhere legal to land.
3. Save.

Keep the localhost one forever — it's what lets you log in while developing.

**Why this matters:** a magic link is only allowed to return you to an address on
this list. If the address isn't listed, Supabase refuses and the browser shows
something that looks like "link expired". It reads as a broken app and is actually
a missing line here — the most common failure with this kind of login.

## 8 · The Vercel deployment — already done, but broken

**What step 8 is:** Vercel is what puts the app on the internet so Moran can open it
on her phone instead of it only existing on your laptop. It watches the GitHub repo
and rebuilds every time you push.

You've done the import — the domain answers. But it currently returns
**404: NOT_FOUND**, and the reason is almost certainly one setting:

### The fix — set the Root Directory

This repo has the Next.js app in a **subfolder** called `aviente`, not at the top.
Vercel looked at the top level, found no app, and shipped nothing.

1. Vercel → your project → **Settings** → **Build and Deployment**.
2. Find **Root Directory**.
3. Set it to:
   ```
   aviente
   ```
4. Save, then **Deployments** → the latest one → ⋯ → **Redeploy**.

### While you are in Settings — the environment variables

**Settings → Environment Variables.** The app needs the same two values you put in
`.env.local`, or it will load and then fail the moment it wants a recipe:

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your API URL | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key | Production, Preview |

**Do not add** `SUPABASE_SERVICE_ROLE_KEY` — nothing deployed needs it.
**Do not add** `NEXT_PUBLIC_E2E` — it turns on password sign-in for the test users,
which in production would walk straight past the login gate.

### One thing to check about the account

The project must sit under your **personal** Vercel account, not a Locusview team.
Vercel → top-left scope switcher: if it says anything resembling Locusview, the
family cookbook is deploying on company infrastructure. Move it to your personal
scope.

## 9 · Flip the repo private

```bash
gh repo edit isaac1310/AvienteBistro --visibility private --accept-visibility-change-consequences
```

Then tell me, and I'll delete the recipe-content block from `.gitignore` so the
seed and your source recipes are versioned again. Until then they're deliberately
kept off the public internet.
