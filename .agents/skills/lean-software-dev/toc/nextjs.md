# Next.js — complete official documentation map

**Live full indexes (ALWAYS prefer these over stale memory):**

- Sitemap: https://nextjs.org/docs/sitemap.md
- LLM index: https://nextjs.org/docs/llms.txt
- Full export: https://nextjs.org/docs/llms-full.txt
- Hub: https://nextjs.org/docs
- Markdown pages: append `.md` to doc URLs (e.g. `/docs/app/getting-started/installation.md`)

AMAN ERP uses **App Router**. Fetch App Router pages unless user asks Pages Router.

## App Router — Getting Started

| Topic | Fetch |
|-------|--------|
| Getting Started | https://nextjs.org/docs/app/getting-started |
| Installation | https://nextjs.org/docs/app/getting-started/installation |
| Project Structure | https://nextjs.org/docs/app/getting-started/project-structure |
| Layouts and Pages | https://nextjs.org/docs/app/getting-started/layouts-and-pages |
| Linking and Navigating | https://nextjs.org/docs/app/getting-started/linking-and-navigating |
| Server and Client Components | https://nextjs.org/docs/app/getting-started/server-and-client-components |
| Fetching Data | https://nextjs.org/docs/app/getting-started/fetching-data |
| Mutating Data | https://nextjs.org/docs/app/getting-started/mutating-data |
| Caching | https://nextjs.org/docs/app/getting-started/caching |
| Revalidating | https://nextjs.org/docs/app/getting-started/revalidating |
| Error Handling | https://nextjs.org/docs/app/getting-started/error-handling |
| CSS | https://nextjs.org/docs/app/getting-started/css |
| Image Optimization | https://nextjs.org/docs/app/getting-started/images |
| Font Optimization | https://nextjs.org/docs/app/getting-started/fonts |
| Metadata and OG images | https://nextjs.org/docs/app/getting-started/metadata-and-og-images |
| Route Handlers | https://nextjs.org/docs/app/getting-started/route-handlers |
| Proxy | https://nextjs.org/docs/app/getting-started/proxy |
| Deploying | https://nextjs.org/docs/app/getting-started/deploying |
| Upgrading | https://nextjs.org/docs/app/getting-started/upgrading |

## App Router — Guides (partial; full list in sitemap.md)

Authentication · Backend for Frontend · Caching · CDN Caching · CI Build Caching · CSP · CSS-in-JS · Custom Server · Data Security · Debugging · Draft Mode · Environment Variables · Forms · ISR · Instrumentation · i18n · JSON-LD · Lazy Loading · Local Development · MCP · MDX · Memory Usage · Migrating · Multi-tenant · Multi-zones · OpenTelemetry · Package Bundling · Prefetching · Production · PWAs · Redirecting · Rendering Philosophy · Sass · Scripts · Self-Hosting · Server Actions · SPAs · Static Exports · Streaming · Testing (Cypress/Jest/Playwright/Vitest) · Third Party · Upgrading/Codemods · Videos · View transitions · …

Fetch: `https://nextjs.org/docs/app/guides/<slug>` or resolve via sitemap.md.

## App Router — API Reference

### Directives
`use cache` · `use cache: private` · `use cache: remote` · `use client` · `use server`  
→ https://nextjs.org/docs/app/api-reference/directives

### Components
`next/font` · Form · Image · Link · Script  
→ https://nextjs.org/docs/app/api-reference/components

### File-system conventions
`default.js` · Dynamic Segments · `error.js` · `forbidden.js` · `instrumentation.js` · `instrumentation-client.js` · Intercepting Routes · `layout.js` · `loading.js` · `mdx-components.js` · `not-found.js` · `page.js` · Parallel Routes · `proxy.js` · `public/` · `route.js` · Route Groups · `src/` · `template.js` · `unauthorized.js` · Metadata files (favicon/icon/OG/robots/sitemap) · Route Segment Config (`dynamicParams`, `maxDuration`, `preferredRegion`, `runtime`, …)  
→ https://nextjs.org/docs/app/api-reference/file-conventions

### Functions / hooks
`after` · `cacheLife` · `cacheTag` · `connection` · `cookies` · `draftMode` · `fetch` · `forbidden` · `generateImageMetadata` · `generateMetadata` · `generateSitemaps` · `generateStaticParams` · `generateViewport` · `headers` · `ImageResponse` · `NextRequest` · `NextResponse` · `notFound` · `permanentRedirect` · `redirect` · `refresh` · `revalidatePath` · `revalidateTag` · `unauthorized` · `unstable_cache` · `unstable_noStore` · `updateTag` · `useLinkStatus` · `useParams` · `usePathname` · `useReportWebVitals` · `useRouter` · `useSearchParams` · `useSelectedLayoutSegment(s)` · `userAgent` · …  
→ https://nextjs.org/docs/app/api-reference/functions

### Configuration
`next.config.js` and all options — full list in sitemap under Configuration  
→ https://nextjs.org/docs/app/api-reference/config/next-config-js

## Pages Router

Still documented. Switch via docs sidebar / sitemap “Pages Router” entries when user asks.  
Hub: https://nextjs.org/docs/pages

## Protocol

1. Fetch https://nextjs.org/docs/sitemap.md if unsure of slug.  
2. Fetch the specific page (prefer `.md`).  
3. Answer from that page only for API/behavior claims.
