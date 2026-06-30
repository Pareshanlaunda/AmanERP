# AMAN ERP

Internal web app with **admin** and **employee** roles, lead management, client onboarding, and notifications.

## Stack

- **Next.js 15** + TypeScript + Tailwind
- **Supabase** — Auth, Postgres, Row Level Security
- **Vercel** — hosting

---

## Local development

### 1. Environment

Copy `.env.local.example` → `.env.local` and fill in from Supabase → **Settings → API** and **Database**.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_PASSWORD=...
```

### 2. Database migrations

```powershell
cd c:\Users\Dell\AMAN-ERP
npm install
npm run migrate
```

Runs all SQL files in order (`migration.sql` through `migration-v5-lead-fields.sql`). Safe to re-run.

### 3. Run locally

```powershell
npm run dev
```

Open [http://localhost:3000/setup](http://localhost:3000/setup) for first admin, or [http://localhost:3000/login](http://localhost:3000/login) if admin already exists.

---

## Deploy to Vercel + Supabase (finish setup)

You already have Supabase. These steps put the **live site** on Vercel.

### Step 1 — Push latest code to GitHub

Most of the app is only on your PC until you push. From the project folder:

```powershell
cd c:\Users\Dell\AMAN-ERP
git add .
git commit -m "AMAN ERP: admin, employee, leads, onboarding, mobile UI"
git push origin main
```

Repo: [github.com/Pareshanlaunda/AmanERP](https://github.com/Pareshanlaunda/AmanERP)

If push fails, run `gh auth login` once, or use GitHub Desktop.

### Step 2 — Confirm Supabase database

Migrations should already be applied locally. To verify:

```powershell
npm run migrate
```

Should say **All migrations up to date.**

Your Supabase project stores all leads, users, and onboarding data — Vercel only hosts the Next.js app.

### Step 3 — Create Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import **Pareshanlaunda/AmanERP** from GitHub
3. Framework: **Next.js** (auto-detected)
4. **Environment variables** — add these three (same values as `.env.local`):

| Name | Where to get it |
|------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret) |

Do **not** add `DATABASE_PASSWORD` or `DATABASE_URL` to Vercel — those are only for local `npm run migrate`.

5. Click **Deploy** and wait ~2 minutes.

You’ll get a URL like `https://aman-erp.vercel.app`.

### Step 4 — Supabase Auth URLs (required for login on live site)

In Supabase → **Authentication → URL Configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | `https://YOUR-APP.vercel.app` |
| **Redirect URLs** | `https://YOUR-APP.vercel.app/**` |

Replace `YOUR-APP` with your actual Vercel domain. Save.

Without this, login on the live site may fail or redirect incorrectly.

### Step 5 — Test live app

1. Open `https://YOUR-APP.vercel.app`
2. Sign in with your existing admin (same Supabase project = same users as local)
3. Or `/setup` if no admin exists yet

### Step 6 — Custom domain (optional)

Vercel → Project → **Settings → Domains** → add your domain, then update Supabase **Site URL** and **Redirect URLs** to match.

---

## Vercel env vars checklist

| Variable | Vercel? | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Required | Client + server Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Required | Client + server Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | Create users, employee list (server only) |
| `DATABASE_PASSWORD` | ❌ Local only | `npm run migrate` |
| `DATABASE_URL` | ❌ Local only | `npm run migrate` |

After changing env vars on Vercel, click **Redeploy** on the latest deployment.

---

## Roles

| Role | Dashboard | Can do |
|------|-----------|--------|
| **Admin** | `/admin/dashboard` | Create/assign leads, manage users, view all data |
| **Employee** | `/employee/dashboard` | Assigned leads, onboarding, chat/comments |

## Lead workflow

1. Admin creates lead (or future WhatsApp webhook)
2. Admin assigns employee
3. Employee starts progress → onboarding form → mark successful
4. Admin notified; full onboarding visible on lead **View**

## CLI scripts (local only)

```powershell
npm run migrate              # Apply SQL migrations
npm run backfill-profiles    # Fix missing profile rows after auth users exist
npm run create-admin         # Legacy — prefer /admin/users or /setup
```
