# Your side — the things Claude can't do

Dashboard clicks, accounts, and secrets. Everything else is in `CHECKLIST.md`.

- [x] **1 · Public signup OFF** — Auth → Sign In / Providers → Email.
- [x] **2 · Four SQL files run** — `0001`, `0002`, `0003`, `seed.sql`.
- [x] **3 · Two users created** — you and Moran, both Auto Confirm.
- [ ] **4 · Link accounts to family members** ← you are here
- [ ] **5 · Keys into `.env.local`** — unblocks all my remaining work
- [ ] **6 · Verify the seed**
- [ ] **7 · Dev Supabase project** — so tests never touch the real recipes
- [ ] **8 · Redirect URLs** — needs the Vercel domain
- [ ] **9 · Vercel import** — needs care about which GitHub account
- [ ] **10 · Flip the repo private**

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

Look for **Project URL**. It looks like:

```
https://abcdefghijklm.supabase.co
```

Click the copy button next to it. Paste it somewhere you can get it back — a
Notes window is fine.

### 5c · Copy the doorbell

Same page, find the key labelled **`anon`** — it may also say **public** or
**publishable**. It's a long string starting `eyJ...`.

Copy it too.

> ⚠️ There is a **second** key on this page called **`service_role`** or
> **secret**. **Do not copy that one.** It ignores every security rule in the
> database. It doesn't belong in this file, doesn't belong in Vercel, and don't
> paste it into a chat with me.
>
> How to tell them apart: the one you want says **anon**. If it says **secret** or
> **service_role**, it's the wrong one.

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
   deployed. `npm run test:reset` refuses to run unless the ref looks like a dev
   database, precisely because it deletes everything.

## 8 · Redirect URLs — after Vercel

Auth → **URL Configuration**

- **Site URL:** your Vercel production domain
- **Redirect URLs:** add both `https://<domain>/**` and `http://localhost:3000/**`

Get this wrong and magic links read as "expired" — it looks like an app bug and
isn't. Most common failure with this auth method.

## 9 · Vercel import — watch the account

1. Sign in to Vercel with the **`isaac1310`** GitHub account. If you connect
   `itzikavineta`, Vercel offers the **Locusview team** as a deploy scope, which
   is exactly what the account rule forbids.
2. Import `isaac1310/AvienteBistro`. Root directory: **`aviente`**.
3. Env vars — **Production**: the production Supabase URL + anon key.
   **Preview**: the *dev* project's URL + anon key, so a PR preview can't write to
   the real cookbook.
4. `NEXT_PUBLIC_E2E` must be set in **neither**. A password login in production
   bypasses the whole auth gate.

## 10 · Flip the repo private

```bash
gh repo edit isaac1310/AvienteBistro --visibility private --accept-visibility-change-consequences
```

Then tell me, and I'll delete the recipe-content block from `.gitignore` so the
seed and your source recipes are versioned again. Until then they're deliberately
kept off the public internet.
