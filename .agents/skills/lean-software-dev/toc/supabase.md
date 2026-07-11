# Supabase — complete official documentation map

**Live hub:** https://supabase.com/docs  
**Always fetch** the specific guide/reference page. Do not invent RLS/SQL/API behavior.

## Products (top-level)

| Product | Docs hub |
|---------|----------|
| Database (Postgres) | https://supabase.com/docs/guides/database |
| Auth | https://supabase.com/docs/guides/auth |
| Storage | https://supabase.com/docs/guides/storage |
| Realtime | https://supabase.com/docs/guides/realtime |
| Edge Functions | https://supabase.com/docs/guides/functions |
| Vector | https://supabase.com/docs/guides/ai |
| Cron | https://supabase.com/docs/guides/cron |
| Queues | https://supabase.com/docs/guides/queues |
| API (Data API / PostgREST) | https://supabase.com/docs/guides/api |
| CLI / Local dev | https://supabase.com/docs/guides/cli |
| Deployment / Production | https://supabase.com/docs/guides/deployment |

## Getting started

https://supabase.com/docs/guides/getting-started  
Framework quickstarts: Next.js, React, Nuxt, Flutter, iOS, Android, SvelteKit, Vue, … (listed on that page).

## Database (fetch subsections as needed)

| Topic | URL pattern / page |
|-------|---------------------|
| Overview | https://supabase.com/docs/guides/database/overview |
| Tables & data | https://supabase.com/docs/guides/database/tables |
| Extensions | https://supabase.com/docs/guides/database/extensions |
| Full Text search | https://supabase.com/docs/guides/database/full-text-search |
| Functions / triggers | https://supabase.com/docs/guides/database/functions |
| Row Level Security | https://supabase.com/docs/guides/database/postgres/row-level-security |
| Column-level security | search under database guides |
| Indexes / performance | https://supabase.com/docs/guides/database/query-optimization |
| Connection pooling / pooling modes | https://supabase.com/docs/guides/database/connecting-to-postgres |
| Branching | https://supabase.com/docs/guides/deployment/branching |
| Backups / PITR | https://supabase.com/docs/guides/platform/backups |
| Replication / publications | database publications in dashboard docs |

## Auth

| Topic | URL |
|-------|-----|
| Auth overview | https://supabase.com/docs/guides/auth |
| Password / email | https://supabase.com/docs/guides/auth/passwords |
| Social login | https://supabase.com/docs/guides/auth/social-login |
| Phone / OTP | https://supabase.com/docs/guides/auth/phone-login |
| MFA | https://supabase.com/docs/guides/auth/auth-mfa |
| SSR / cookies (Next.js) | https://supabase.com/docs/guides/auth/server-side |
| JWT / sessions | https://supabase.com/docs/guides/auth/sessions |
| Auth Hooks | https://supabase.com/docs/guides/auth/auth-hooks |
| Rate limits | https://supabase.com/docs/guides/auth/rate-limits |
| CAPTCHA | https://supabase.com/docs/guides/auth/auth-captcha |
| Custom SMTP | https://supabase.com/docs/guides/auth/auth-smtp |

## API security

| Topic | URL |
|-------|-----|
| Securing your API | https://supabase.com/docs/guides/api/securing-your-api |
| API keys | https://supabase.com/docs/guides/api/api-keys |
| Creating routes / RPC | https://supabase.com/docs/guides/api |

## Realtime

https://supabase.com/docs/guides/realtime  
Postgres Changes · Broadcast · Presence · Authorization

## Storage

https://supabase.com/docs/guides/storage  
Buckets · CDN · Access control / RLS on `storage.objects` · Image transforms

## Edge Functions

https://supabase.com/docs/guides/functions  
Local develop · Deploy · Secrets · CORS · Scheduling

## Client libraries

| Client | URL |
|--------|-----|
| JavaScript | https://supabase.com/docs/reference/javascript/introduction |
| Flutter | https://supabase.com/docs/reference/dart/introduction |
| Swift | https://supabase.com/docs/reference/swift/introduction |
| Kotlin | https://supabase.com/docs/reference/kotlin/introduction |
| Python | https://supabase.com/docs/reference/python/introduction |

JS reference covers: `createClient`, Auth methods, `from().select/insert/update/delete`, RPC, Realtime channels, Storage, Functions invoke — **fetch the method page**.

## Production checklist

https://supabase.com/docs/guides/deployment/going-into-prod  
Security Advisor · Performance Advisor · RLS · SSL · Network restrictions · MFA · SMTP · indexes · load testing · backups/PITR · rate limits

## Platform / org

https://supabase.com/docs/guides/platform  
Compute · Disk · Spend caps · Logs · Advisors · Management API

## Protocol

1. Open https://supabase.com/docs and/or this TOC.  
2. Fetch the exact guide/reference.  
3. For SQL/RLS: prefer official RLS + securing-API pages over blog posts.  
4. `service_role` never in browser — official key docs.
