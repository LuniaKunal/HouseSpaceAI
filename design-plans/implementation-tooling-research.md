# Implementation tooling research

Verified: 2026-09-11. Scope: supporting infrastructure and non-OpenAI image options for the HomeSpace AI feature roadmap. Prices are USD unless specified; these are published rates, not a quote or measured operating bill. No accounts, installations, deployments, or paid generations were performed.

## Recommended minimal stack

Keep the existing Vite frontend. Serve its static build on Cloudflare Pages; run a Node API and a background worker on Railway; use one Supabase project for Auth, PostgreSQL and private object storage; put durable jobs in that PostgreSQL database through pg-boss. Evaluate one paid image API before committing to its quality and costs. This is an architectural recommendation, not an assertion that the integrations already exist.

Avoid adding Redis, a second storage vendor, or a hosted workflow vendor at the first milestone. pg-boss uses the database already required for projects and credits. Keep API and worker as separate commands from the same codebase so their deployment and concurrency can evolve independently. Both processes must fit the host's usage budget.

## Free and paid services

| Component | Classification and verified facts | Implementation consequence |
| --- | --- | --- |
| Supabase hosted | Free: 50,000 monthly active users, 500 MB database, 1 GB file storage, 5 GB egress plus 5 GB cached egress; two active projects; pauses after one week of inactivity. Pro starts at $25/month, including compute credits sufficient for one Micro instance; additional projects/compute/overages can cost more. | Free fits evaluation, not an assumption of production reliability. Images can exhaust storage before auth quotas matter. [Official pricing](https://supabase.com/pricing). |
| pg-boss | MIT open source; PostgreSQL-backed Node queue with retries/backoff, concurrency policies and transaction integration. Current README lists PostgreSQL 13+ and Node 22.12+ for CommonJS require(esm). | No separate queue subscription. Pay indirectly for database/worker resources and monitor queue size. Pin and test the actual selected version. [Maintainer repository](https://github.com/timgit/pg-boss). |
| Railway | Hobby has a $5 monthly minimum including $5 resource usage; usage above it increases the bill. Pro similarly includes $20 resource usage. Trial grants $5 once, expiring after 30 days. | Budget API and worker CPU/RAM/network together; do not describe trial as free permanent hosting or $5 as a guaranteed total. [Plan documentation](https://docs.railway.com/pricing/plans), [pricing and trial](https://railway.com/pricing). |
| Cloudflare Pages | Free plan supports 500 builds/month, one concurrent build, 20,000 files, and a 25 MiB per-asset maximum. Pages Functions use Workers quotas. | Good fit for the static Vite build. Store user images in private object storage, not the frontend deployment; run persistent job workers elsewhere. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/). |
| BFL FLUX.2 API | Paid usage-based image generation/editing. FLUX.2 pro published pricing is $0.03 first output MP, $0.015 additional output MP, and $0.015/reference MP. | Consider as a measured alternative provider for photo/3D screenshot edits, behind the same application interface. [Pricing](https://bfl.ai/pricing?category=flux.2). |
| Razorpay | Paid per successful transaction, with standard advertised 2% + GST and no setup or annual maintenance charges. Payment-method and optional-service rates can differ. | Candidate for an Indian business; confirm account activation, supported payment methods and international requirements before implementation. Do not assume advertised promotions persist. [Official pricing](https://razorpay.com/pricing/). |
| Stripe | Account availability is constrained: new India accounts are invitation-only; existing active accounts continue to be supported. | If the operating business is in India, make provider eligibility an early decision. Do not make Stripe onboarding a launch dependency without an active account. [Stripe India availability](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india?locale=en-GB). |

## Integration details that affect the roadmap

### Database connections and queue durability

Supabase recommends direct connections for persistent clients; direct endpoints normally require IPv6 unless the IPv4 add-on is enabled. Shared session pooling provides an IPv4 alternative. Transaction pooling does not retain session state and has prepared-statement limitations. For a persistent pg-boss worker, choose a direct or session connection, cap connection pools, and test migrations, processing, reconnects, and shutdown against the deployed database. [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

pg-boss can enqueue within an existing database transaction. Use that capability, or an explicitly designed outbox, so accepting a generation and reserving its credits cannot succeed without creating work. Its delivery semantics do not make remote paid API calls exactly-once: a network failure after submission needs reconciliation through the saved provider task ID. Do not blindly resubmit an ambiguous chargeable request. These are implementation recommendations based on the queue's transaction support. [pg-boss repository](https://github.com/timgit/pg-boss).

Railway can build from a Dockerfile or Railpack and deploy the resulting application. Give API and worker explicit start commands; implement health checks, graceful shutdown, persisted job state, and restart recovery as acceptance tests. [Railway deployment documentation](https://docs.railway.com/cli/deploying).

### Authentication email is another dependency

Supabase's default email sender is intended for testing, currently limited to two messages/hour and without a delivery SLA. Add a custom SMTP provider before public email sign-in/password-reset flows. Its free allowance, domain verification, and eventual cost must be checked when selected; SMTP is not automatically covered by choosing Supabase Pro. [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

### BFL model selection and cost examples

BFL now recommends FLUX.2 for new work instead of FLUX.1 Kontext. The FLUX.2 pro API supports multiple references (up to eight through API, ten in playground), with output up to 4 MP. Use a fixed endpoint for reproducible evaluation; do not equate reference editing with measured room geometry preservation. Benchmark walls, openings, perspective and furniture before selecting it. [FLUX.2 overview](https://docs.bfl.ai/flux_2/flux2_overview), [Kontext guidance](https://docs.bfl.ai/kontext/kontext_overview).

For FLUX.2 pro, one reference at or below 1 MP plus a 1 MP output is $0.045; a 2 MP reference plus 2 MP output is $0.075. One thousand successful 1 MP edits at that configuration would cost $45 in generation fees; 20% additional billable attempts brings that example to $54. These are arithmetic examples from published rates, excluding storage, hosting, tax and payment charges. Each input and output rounds up separately to whole MP; BFL defines 1 MP as 1024 × 1024 pixels. Avoid budgeting from a text-to-image headline price alone. [BFL pricing](https://bfl.ai/pricing?category=flux.2).

## Local and lower-cost alternatives

Use Supabase CLI plus a supported container runtime to run local PostgreSQL, Auth and Storage; run Node API/worker and Vite locally. The local stack does not consume hosted quotas. Use a deterministic mock image provider for ordinary UI, failure, ownership and ledger tests; reserve real paid generations for a bounded benchmark. Local development is not a public production deployment. [Supabase local development](https://supabase.com/docs/guides/local-development).

For actual local inference, FLUX.2 klein 4B has Apache 2.0 weights and BFL describes approximately 13 GB VRAM operation. The 9B and dev variants have different non-commercial licensing. Hardware, electricity, hosting, operational effort and output quality still matter: open weights do not mean free production operation. Compare klein 4B on the same room-preservation benchmark before considering it a substitute for a hosted model. [Model and license distinctions](https://docs.bfl.ai/flux_2/flux2_overview).

## Budget planning notes

A small hosted pilot using Supabase Pro plus Railway Hobby starts with a nominal $30/month platform baseline, before Railway usage above its allowance, image generation, SMTP, domains, taxes and payment processing. This is a lower-bound planning example, not a capacity guarantee. Free Supabase can lower the pilot baseline while accepting its quotas and pause behavior.

Track generated originals and thumbnails separately, configure retention, avoid unbounded queue history, and meter downloaded bytes. Supabase bills storage/egress and other usage beyond plan allowances. Staging projects, backups, image transformations, support, retries, unused variants and provider-side ambiguous submissions are easy costs to overlook. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase).

The first implementation gate should confirm provider eligibility and a small room-image benchmark; the first launch gate should measure successful-output cost, total attempts, accepted geometry quality and the complete monthly platform estimate.
