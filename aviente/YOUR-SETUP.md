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

This does **not** need the Vercel domain. Until it's done the homepage counts are
hard-coded and I can't wire the database.

1. Project Settings → **API**.
2. Copy the **Project URL** and the **anon / publishable** key.
3. In a terminal:
   ```bash
   cp ~/Documents/Recipes/aviente/.env.example ~/Documents/Recipes/aviente/.env.local
   ```
4. Open `.env.local`, paste both values, and set `NEXT_PUBLIC_E2E=1`.
5. Restart the dev server.

The anon key is **safe** in client code — RLS protects the data, not key secrecy.
The **`service_role`** key is not: leave it out, keep it out of Vercel, and don't
paste it into chat.

**Done when:** the category counts come from the database.

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
