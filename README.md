# AMAN Client Onboarding

Internal web app for employees to submit client onboarding forms and view all submissions in a searchable dashboard.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + shadcn-style UI components
- **Supabase** — Auth (individual employee accounts) + Postgres database
- **Vercel** — free hosting (recommended)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migration in [`supabase/migration.sql`](supabase/migration.sql).
3. Go to **Authentication → Users → Add user** and create employee accounts (email + password). Do not enable public sign-up.
4. Copy your project URL and anon key from **Project Settings → API**.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with an employee account, and test the flow.

## Deploy to Vercel (free, 24/7)

1. Push this repo to GitHub (private recommended).
2. Import the repo at [vercel.com](https://vercel.com).
3. Add the same `NEXT_PUBLIC_SUPABASE_*` env vars in Vercel project settings.
4. Deploy — your site will be live with HTTPS.

## Features

- Employee login (individual accounts via Supabase Auth)
- Client onboarding form with all required fields (~40 fields, organized in sections)
- Dashboard table with search by client name
- Data stored in Supabase Postgres with Row Level Security
- Email to advocate: stubbed in `lib/email.ts` — add Resend when ready

## Future: Email to advocate

When you have a verified domain, add `RESEND_API_KEY` and implement `sendAdvocateEmail()` in [`lib/email.ts`](lib/email.ts).
