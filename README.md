# AMAN ERP

Internal web app with **admin** and **employee** roles, lead management, client onboarding, WhatsApp (Botbiz), notices, and notifications.

**Production:** Hostinger Node on `ops.debtfreelawyer.in` + Supabase (Auth / Postgres / RLS).

## Stack

- **Next.js 15** + TypeScript + Tailwind
- **Supabase** — Auth, Postgres, Row Level Security
- **Hostinger** — Node hosting (primary). Vercel optional for staging only.

---

## Local development

### 1. Environment

Copy `.env.local.example` → `.env.local` and fill in from Supabase → **Settings → API** and **Database**.

Required at minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_PASSWORD=...
BOTBIZ_WEBHOOK_SECRET=...
```

See `.env.local.example` for Botbiz chat API, Resend email, Upstash rate limits, and Hostinger `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.

### 2. Database migrations

```powershell
cd "c:\Users\Dell\AMAN ERP"
npm install
npm run migrate
```

Runs all SQL files in order through **v34** (`scripts/run-migration.mjs`). Safe to re-run — already-applied files are skipped.

### 3. First admin

`/setup` is disabled (redirects home). Create the first admin locally:

```powershell
npm run create-admin
```

Then open [http://localhost:3000/login](http://localhost:3000/login). More users: Admin → Users (or `npm run create-employee`).

### 4. Run locally

```powershell
npm run dev
```

---

## Deploy (Hostinger + Supabase)

1. Push code; deploy Node app on Hostinger (build + `next start`).
2. Set env vars from `.env.local.example` in hPanel (including `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for stable Server Actions).
3. Point domain SSL at the Node process (`ops.debtfreelawyer.in`).
4. Supabase → **Authentication → URL Configuration**: Site URL + Redirect URLs = your ops domain.
5. Run `npm run migrate` from a machine with `DATABASE_PASSWORD` / `DATABASE_URL` against the same Supabase project.
6. Configure Botbiz webhook → `https://ops.debtfreelawyer.in/api/webhooks/botbiz` (see `components/Whatsapp/BOTBIZ-SETUP.md`).

Redeploy Hostinger after app code changes. DB migrations apply separately via `npm run migrate`.

### Hosting checklist

| Piece | Where | Notes |
|-------|--------|------|
| App | **Hostinger Node** | Needs Node runtime |
| Database + Auth + RLS | **Supabase** | Not on the app host |
| Domain / SSL | **Hostinger** | HTTPS in front of Node |

**Phase 0:** Hostinger Node + Supabase + Botbiz webhook (+ optional chat API).  
**Phase 1:** Supabase Pro when you need backups / higher traffic.  
**Phase 2:** Upstash Redis rate limits (`UPSTASH_*`), Sentry, Cloudflare WAF when volume grows.

### Env vars on Hostinger

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Client + server Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client + server Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin ops (server only) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | ✅ on Hostinger | Stable Server Action IDs |
| `BOTBIZ_WEBHOOK_SECRET` | ✅ if WhatsApp | Webhook auth |
| `BOTBIZ_API_KEY` / `BOTBIZ_PHONE_NUMBER_ID` | chat panel | Send/load WhatsApp |
| `DATABASE_PASSWORD` / `DATABASE_URL` | ❌ app host | Local `npm run migrate` only |
| `UPSTASH_REDIS_REST_*` | optional | Shared rate limits |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | optional | Advocate emails |

---

## Roles

| Role | Dashboard | Can do |
|------|-----------|--------|
| **Admin** | `/admin/dashboard` | Assign leads, manage users, view all data |
| **Employee** | `/employee/dashboard` | Assigned leads, onboarding, chat/comments |

## Lead workflow

1. Lead arrives (WhatsApp webhook or admin)
2. Admin assigns primary (+ optional co-assignees)
3. Employee starts progress → onboarding form → mark converted (successful)
4. Admin notified; full onboarding visible on lead View

## CLI scripts (local only)

```powershell
npm run migrate              # Apply SQL migrations (through v34)
npm run backfill-profiles    # Fix missing profile rows after auth users exist
npm run create-admin         # First admin (prefer /admin/users after that)
npm run create-employee      # CLI employee create
```

## Optional: Vercel staging

Import the GitHub repo on Vercel, set the three Supabase keys, and mirror Auth Site URL / Redirect URLs. Prefer Hostinger for production `ops` traffic.
