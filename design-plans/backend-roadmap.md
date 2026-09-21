# Backend and workflow implementation tracker

Updated: 2026-09-21. Work proceeds one phase at a time; completion requires the acceptance checks below. The supplied Fastify architecture is a proposal, not an instruction to implement every listed service at once.

## Current evidence and decisions

- Preserve Fastify, Supabase Auth/private storage, PostgreSQL, pg-boss, image normalization, cost consent, owner checks, and the job admission/idempotency ledger.
- Architectural projects and autosave currently use IndexedDB (`src/state/projectStore.ts`, `src/storage/indexedDBStorage.ts`). Photo-library cloud revisions do not provide cloud persistence for architectural scenes.
- Keep the frontend authoritative for interactive edits and WebMCP. Save renderer-independent scene snapshots after activity settles.
- Keep pg-boss for now: it already enqueues alongside job reservations in a PostgreSQL transaction. Redis/BullMQ would introduce a second infrastructure dependency without a demonstrated requirement.
- Existing backend files are JavaScript ES modules. Introduce typed contracts incrementally with scene persistence; the current frontend TypeScript check does not typecheck backend JavaScript.
- The untracked master prompt also proposes FastAPI/Python. That conflicts with the supplied Fastify proposal and the running implementation; it is not treated as authorization to change frameworks.

## Phases

| Phase | Status | Deliverables | Exit criteria |
| --- | --- | --- | --- |
| 1. Maintainable foundation | Complete locally | App/startup split, extracted generation worker, liveness, repeatable backend checks, accurate launch instructions | Backend tests and typecheck pass; compatibility factory and protected photo routes work |
| 2. Cloud project persistence | Next | Versioned scene contract, personal workspaces/membership, project metadata and draft tables, authenticated `/api/v1/projects` routes, revision compare-and-swap | Two writes with the same revision produce one success and one 409; cross-user access fails; invalid scenes never persist; migrations tested on an isolated database |
| 3. Reliable editing and recovery | Planned | Debounced single-flight cloud autosave, IndexedDB pending drafts, explicit local-project import, conflict recovery, immutable checkpoints and transactional restore | Offline/reload/project-switch tests preserve edits; stale saves never overwrite; restore creates a new revision; local projects remain recoverable |
| 4. Assets and sharing | Planned | Stable catalog IDs, signed uploads with size/type checks and finalize verification, private asset ownership, expiring/revocable read-only links | Unauthorized uploads/downloads fail; expired/revoked links fail; uploaded assets cannot be referenced across owners |
| 5. AI and job workflows | Planned | Separate API/worker processes, provider adapters, structured scene commands and validation, durable usage records, job observability | Worker restart recovery passes without duplicate provider billing; invalid operations leave scene unchanged; permissions/revision checked at application time |
| 6. Rendering and exports | Planned | Version-pinned render records, queued worker execution, output storage and history | API returns promptly; retry/cancel behavior is explicit; result points to the exact input version |
| 7. Collaboration and SaaS | Planned | Presence first, authorized operation broadcasts, review/comments, centralized entitlements and metering | Workspace roles enforced across HTTP and sockets; reconnect tested; billing mutations idempotent |

## Phase 1 implementation record

- [x] `server/app.mjs` constructs the application without binding a port or registering process signals.
- [x] `server/photo-design.mjs` preserves `createPhotoServer` and its executable development entry point.
- [x] `server/workers/photo-generation.mjs` isolates provider execution and result persistence. Execution remains in-process until Phase 5; this extraction alone does not isolate CPU or failure domains.
- [x] `server/runtime.mjs` owns listening, signal cleanup, and closing after a listen failure.
- [x] `server/start.mjs` starts the API on 4174 by default, matching the existing Next.js rewrite, instead of trying to serve the obsolete `dist` build.
- [x] `/health` returns liveness only. Dependency readiness remains future work; a 200 does not prove database/storage/provider availability.
- [x] `npm run check:backend` runs TypeScript and local backend regression tests without requiring paid provider calls.
- [x] Full-suite runner prints subprocess failure details rather than hiding them.

No database migration, hosted deployment, new service subscription, or paid generation is part of this phase. Existing endpoint paths and photo response shapes are preserved. Startup change: use separate Next.js and API processes as documented below; callers relying on `start:server` serving a static site must update their launch configuration.

Verification on 2026-09-21: `npm run check:backend` passed (TypeScript plus 9 backend tests). `npm run test:all` passed all 14 suites after allowing subprocess execution outside the sandbox. The lifecycle test starts a real loopback listener and verifies cleanup. Production build, browser smoke testing, and live Supabase tests were not run in this phase.

## Development and verification workflow

1. Run `npm run dev:all` for frontend on 4173 and API/worker on 4174.
2. Run `npm run check:backend` for each backend slice. This includes real local HTTP photo tests, fake-provider generation, restart recovery, image validation and lifecycle coverage.
3. Run `npm run test:all` for editor/project/WebMCP compatibility. Windows sandbox restrictions can block esbuild subprocesses with EPERM; rerun in an environment that permits subprocesses.
4. For persistence phases, apply migrations to an isolated test database and run owner-isolation/concurrency tests before connecting the frontend. Live cloud tests are separate and require configured test resources.
5. Before release, run `npm run build`, exercise the browser workflow, and record deployment-specific auth/origin/proxy checks.
6. Update this tracker with completed tasks, commands/results, outstanding limitations and the next slice. Do not mark an entire phase complete from scaffolding alone.

For a local production-mode smoke test, run `npm run build`, then run `npm start` and `npm run start:server` in separate terminals. The API command loads `.env.local`; Next proxies photo requests to 127.0.0.1:4174. Separate hosting needs an explicit reachable API destination and trusted origin configuration; this phase does not deploy it.

## Next implementation slice: Phase 2

- [ ] Define a canonical scene envelope using actual `SceneData`, current feet/meters metadata, and schema version 1; do not substitute the illustrative document schema blindly.
- [ ] Extract reusable authenticated-user and membership checks before adding new route families.
- [ ] Add additive workspace/project/draft migrations and a narrow repository API using parameterized SQL.
- [ ] Implement project creation/list/load and atomic revision-checked scene save, with payload limits and consistent validation errors.
- [ ] Test denied access, malformed scenes, simultaneous saves, rollback, deletion and restart persistence.
- [ ] Add the `/api/v1` proxy when the routes exist; keep existing local projects untouched until the explicit import flow in Phase 3.

Broader foundation follow-ups belong in these slices: reusable error handling, redacted structured logging, dependency readiness, backend static typechecking, deployment automation, and route/module extraction as new domains arrive.
