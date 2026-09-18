# Photo Design MVP

Updated 14 September 2026. The Supabase project is connected, its migration is applied, and live queue/account-isolation tests pass. OpenAI generation is implemented but is disabled until OPENAI_API_KEY is supplied. No paid image request was made during these checks.

## What works

- Local 2D/3D home planning remains available without an account. Architectural projects remain in IndexedDB; this milestone does not migrate them to Supabase.
- Photo Design uses email/password sign-in and a private Supabase library when configured. Without any Supabase configuration, it retains the single-user local library and file-backed job fallback.
- Upload, room/style settings, design briefs, generated/imported concepts, comparison, favorites, download, and deletion share the same PhotoDesignService interface with all 13 existing photo WebMCP tools.
- Fastify handles bounded JSON requests, origin/host checks, authenticated ownership, throttling and optional production static files. Sharp decodes and normalizes photos on the server, removes metadata, applies orientation, limits input to 24 MP / 12 MB, resizes to 2048 px and creates 480 px result thumbnails.
- pg-boss runs against Supabase PostgreSQL. A database transaction reserves the attempt and enqueues its ID together. The worker atomically claims the app job before contacting OpenAI. Queue delivery can retry; a claimed paid request is never automatically submitted again.
- Default caps: 10 attempts across the installation and 3 per account per UTC day. Failed, deleted and unknown attempts count. These are attempt limits, not dollar budgets. One outstanding request per user is allowed.
- The cloud library stores at most 30 designs and 30 results per design. Supabase's plan storage/egress limits still apply.

## Free tools and costs

Fastify, Sharp, pg, pg-boss, the Supabase JavaScript client, Playwright and tsx are free software dependencies. Supabase is currently on its Free plan. No paid hosting, Redis, billing gateway, monitoring subscription, or additional image vendor was provisioned. PostgreSQL comes from Supabase, so Docker is not needed for this setup.

OpenAI API generation costs money. Preparing briefs, uploading, saving and comparing do not call OpenAI. The server requests one low-quality JPEG using gpt-image-1-mini by default, and the UI/WebMCP confirmation remains required. API billing, model access and real design quality have not been tested without a key.

## Setup and commands

Use Node 24 or newer. Run npm ci after cloning. Copy .env.example to .env.local and fill it locally. Never commit that file or paste server credentials into chat.

| Variable | Purpose |
| --- | --- |
| VITE_SUPABASE_URL | Public project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public browser key; never a service-role key |
| SUPABASE_URL | Same project URL for the backend |
| SUPABASE_SERVICE_ROLE_KEY | Server-only secret/service-role key for private generated assets and token verification |
| DATABASE_URL | PostgreSQL Session pooler URI from Connect, port 5432, not the HTTPS project URL |
| DATABASE_PASSWORD | Database password; may be separate from the URI, without percent-encoding |
| DATABASE_CA_FILE | Optional custom CA file; Supabase's published CA is bundled under server/certs |
| OPENAI_API_KEY | Optional until generation is enabled; server only |
| PHOTO_DAILY_LIMIT / PHOTO_USER_DAILY_LIMIT | Global and per-user daily attempt limits |
| APP_ORIGIN | Exact public website origin, or http://127.0.0.1:4173 locally |

```sh
npm run db:migrate
npm run dev:all
```

Open http://127.0.0.1:4173/photos. The development website runs on 4173 and the photo backend/worker on 4174. Restart the backend after changing secrets. npm run dev starts only the frontend; npm run dev:photos starts only the API/worker.

For a production build served by one persistent Node process:

```sh
npm run build
npm start
```

npm start serves dist, the API and the queue worker on port 4173 by default. Set PORT, HOST and APP_ORIGIN for an actual host and terminate HTTPS at a reverse proxy. No public deployment was made. A static-only Vercel deployment cannot run this persistent worker; deploy the Node process on suitable infrastructure before advertising online generation. Hosting may have separate costs.

## Storage, ownership and recovery

public.photo_designs contains metadata, with owner-based row-level security. save_photo_design checks revision numbers to reject stale writes. The photo-library bucket is private and restricts each user's paths. Browser uploads are normalized; generation independently validates/decodes the bytes with Sharp before OpenAI sees them.

private.photo_jobs holds the job ledger; it is unavailable to anonymous/authenticated Data API clients. The photo-designs bucket has no client-write policy. Fastify verifies Supabase access tokens and checks the job owner before serving results, thumbnails, status or deletion. No secret keys enter frontend bundles or tool results. Database connections verify Supabase's CA and hostname.

Queued source files are private. Completed processing removes the temporary source. A worker interrupted after claiming a job leaves an unknown outcome after recovery; it does not automatically regenerate a potentially billed request. Local mode marks running jobs unknown on restart and resumes queued files. Job deletion removes known images but keeps a minimal idempotency/attempt tombstone.

The photo library lists metadata without fetching every full-size image. Selected-image downloads use a bounded cache; unchanged status polls do not update the stored revision. Studio, dashboard, photo workspace and agent modal code are split into separate bundles. The main entry shrank from approximately 1.92 MB to 181 KB uncompressed in the measured builds; background WebMCP/shared modules still load, so this is not the total network payload.

## WebMCP

The 13 photo tools remain available through document.modelContext and window.housespaceAgent. They use the signed-in library when Supabase is configured, and reject photo access when signed out. Credentials are never exposed to agents. generate_photo_design still requires confirmApiCost plus the existing user-confirmation gate. read_photo_design_asset is the explicit image-returning tool; telemetry redacts image data URLs.

## Verification

- npm run build: TypeScript and production bundle.
- npm run test:all: 12 architecture, geometry, project and photo/WebMCP suites.
- npm run test:photos:server: image limits/orientation/metadata, duplicate reservations, restart recovery, HTTP routes, consent, limits and fake-provider outcomes.
- node node_modules/@playwright/test/cli.js test --config playwright.photo.config.ts: isolated local workflow, comparison, persistence, mobile layout, downloads and WebMCP. It starts a test-only server on 4175 with cloud configuration disabled.
- Live tests require RUN_SUPABASE_TESTS=1. npm run test:photos:cloud checks the actual PostgreSQL queue, private storage, row-level security and stale-write rejection. The fake provider cannot call OpenAI.
- With npm run dev:all running, RUN_SUPABASE_TESTS=1 and playwright.cloud.config.ts verify cloud sign-in, upload, saved settings, reload and switching accounts. Temporary test accounts are confirmed without sending email and cleaned up afterward.

## Remaining launch work

This is a connected MVP, not completion of every later roadmap feature. Clean 3D scene capture, syncing architectural projects to accounts, brush edits, staging, payments and video remain outside this milestone.

Before a broader public launch: configure and test Supabase's email delivery and redirect URLs for the real domain, choose a persistent backend host, benchmark real OpenAI outputs, and establish storage/egress monitoring and cleanup. Supabase's built-in mail service has restricted delivery; public signup may require a separate SMTP provider. No SMTP vendor was added without a decision.

Failed or interrupted uploads can leave unreferenced private files. After at least seven days, an operator can compare photo-library paths against photo_designs source/result asset IDs and remove only unreferenced files in Storage. Likewise remove abandoned temporary job sources only after the associated job is terminal. Do not delete recent files or files linked to queued/running jobs. Account deletion and orphan cleanup are not yet automated. Keep this operational limitation visible before public rollout.

## Official references

- [Fastify request limits](https://fastify.dev/docs/latest/Reference/Server/)
- [Sharp decoding and pixel limits](https://sharp.pixelplumbing.com/api-constructor/)
- [pg-boss queue behavior](https://github.com/timgit/pg-boss)
- [Supabase token verification](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase TLS verification](https://supabase.com/docs/guides/platform/ssl-enforcement)
- [OpenAI image edits](https://developers.openai.com/api/reference/resources/images/methods/edit)
