# HouseSpace Backend — Master Implementation Prompt

You are working inside the existing **HouseSpace** codebase.

HouseSpace is a browser-based interior design SaaS where users can create, edit, visualize, and present homes in 2D/3D. The current product uses a modern frontend stack with **Next.js / React / Three.js / React Three Fiber / WebGPU**, supports editable project scenes, furniture placement, AI-assisted workflows, and WebMCP tools.

Your task is to **design and incrementally implement the backend foundation** without breaking the current editor.

---

# 1. Core Objective

Build a production-ready backend that supports:

- authentication
- workspaces
- projects
- canonical scene storage
- autosave
- scene version history
- restore / rollback
- operation logs
- asset storage
- AI orchestration
- WebMCP persistence
- background jobs
- rendering/export jobs
- public sharing/showcase
- usage limits
- billing
- future collaboration

The architecture must be simple enough for a small team / solo developer to maintain.

---

# 2. Required Architecture

Use a **modular monolith**, not microservices.

Preferred stack:

```text
Frontend
Next.js
React
Three.js / React Three Fiber
WebGPU

Backend
FastAPI
Python

Database
PostgreSQL / Supabase

Authentication
Supabase Auth

Storage
Supabase Storage

Cache / Queue / Rate Limits
Redis / Upstash Redis

Workers
Python background worker

Monitoring
Sentry

Analytics
PostHog
```

Do NOT introduce:

```text
Kubernetes
Kafka
service mesh
many microservices
custom authentication
custom payment infrastructure
GPU render farm
```

unless a real product requirement proves they are necessary.

---

# 3. Non-Negotiable Architecture Rules

## Rule 1 — One canonical scene

There must be only **one authoritative structured scene format** for every project.

The same scene must be used by:

```text
Editor
AI
WebMCP
Presentation Mode
Export
Showcase
```

Do not create different incompatible scene representations.

---

## Rule 2 — AI does not own project state

AI may suggest structured operations.

HouseSpace must validate and apply them.

Correct:

```text
User request
    ↓
AI
    ↓
Structured HouseSpace tool call
    ↓
Validation
    ↓
Scene mutation
    ↓
Save
```

Wrong:

```text
AI generates arbitrary code
    ↓
Execute it
```

Never execute arbitrary model-generated JavaScript/Python against the application.

---

## Rule 3 — Interactive 3D stays client-side

The browser should handle:

- dragging
- transforms
- selection
- camera movement
- rendering
- snapping
- temporary edits
- local undo/redo
- presentation transitions

The backend should not be involved in every frame or pointer movement.

---

## Rule 4 — Heavy work becomes asynchronous

Use background jobs for:

```text
floorplan processing
vision processing
large AI jobs
thumbnail generation
rendering
asset optimization
email
analytics aggregation
cleanup
```

---

## Rule 5 — Never hard-code a project

No floor plan, room, sample layout, furniture arrangement, camera position, or project must be hard-coded into backend logic.

Everything should derive from project data.

---

# 4. FIRST: Audit the Existing Repository

Before changing code, inspect the current implementation.

Find and document:

1. Next.js project structure
2. current backend/API routes
3. Supabase configuration
4. database schema
5. authentication flow
6. where projects are currently stored
7. whether IndexedDB/localStorage is used
8. scene serialization format
9. current project schema
10. WebMCP tools
11. AI integrations
12. asset loading/storage
13. environment variables
14. deployment setup
15. existing tests

Do not perform a large refactor before understanding the existing system.

After the audit, provide:

```text
Current Architecture
Problems
Reusable Parts
Required Changes
Migration Risks
Implementation Plan
```

Prefer adapting existing working code over creating duplicate systems.

---

# 5. Backend Project Structure

Create or adapt a clean FastAPI architecture similar to:

```text
backend/
  app/
    main.py

    api/
      v1/
        auth.py
        workspaces.py
        projects.py
        scenes.py
        assets.py
        ai.py
        renders.py
        showcase.py
        billing.py

    core/
      config.py
      security.py
      logging.py
      errors.py

    db/
      session.py
      models/
      migrations/

    schemas/
      workspace.py
      project.py
      scene.py
      asset.py
      ai.py
      render.py

    services/
      projects/
      scenes/
      assets/
      ai/
      rendering/
      showcase/
      billing/

    scene/
      validator.py
      operations/
      migrations/

    integrations/
      supabase.py
      redis.py
      openai.py
      gemini.py
      payments.py

    workers/
      worker.py
      ai_jobs.py
      render_jobs.py
      asset_jobs.py

    tests/
```

Keep HTTP route handlers thin.

Business logic belongs inside services.

---

# 6. Authentication

Use **Supabase Auth**.

Flow:

```text
Browser
  ↓
Supabase Auth
  ↓
JWT
  ↓
FastAPI
  ↓
Verify JWT
  ↓
Resolve user
```

Do not store passwords yourself.

FastAPI must verify JWT server-side.

---

# 7. Authorization

Every request involving a project must verify:

```text
authenticated user
        ↓
workspace membership
        ↓
project belongs to workspace
        ↓
required permission
```

Never trust these values from the browser:

```text
user_id
workspace_id
project ownership
subscription level
AI credits
permissions
billing status
```

---

# 8. Workspaces

Create:

```sql
workspaces
```

Suggested fields:

```text
id
name
slug
owner_user_id
created_at
updated_at
```

Create:

```sql
workspace_members
```

Fields:

```text
workspace_id
user_id
role
created_at
```

Recommended roles:

```text
owner
admin
designer
viewer
client
```

Initially, every user can receive a default workspace automatically.

---

# 9. Projects

Create:

```sql
projects
```

Suggested fields:

```text
id
workspace_id
created_by

name
slug
description

status
visibility

current_scene_version_id

thumbnail_url
preview_url

unit_system
floor_area

created_at
updated_at
last_opened_at
deleted_at
```

Visibility:

```text
private
unlisted
public
```

Use soft deletion.

---

# 10. Canonical Scene Storage

Do not immediately normalize every wall, room, sofa, camera, and material into separate database tables.

Store the full scene as structured **JSONB snapshots**.

Example:

```json
{
  "schemaVersion": 1,
  "units": "meters",

  "floors": [],
  "rooms": [],
  "walls": [],
  "openings": [],
  "furniture": [],
  "materials": [],
  "lights": [],
  "cameras": [],

  "environment": {}
}
```

The scene must contain stable IDs for entities.

Examples:

```text
room_01
wall_27
door_12
sofa_41
camera_hero
```

---

# 11. Scene Version Table

Create:

```sql
project_scene_versions
```

Fields:

```text
id
project_id

version_number
schema_version

scene_json JSONB

created_by
reason
is_autosave

created_at
```

Unique constraint:

```text
(project_id, version_number)
```

Reasons may include:

```text
autosave
manual_save
before_ai_change
after_ai_change
import
restore
```

---

# 12. Autosave

Do not save on every mouse movement.

Use:

```text
local edit
    ↓
mark project dirty
    ↓
debounce for approximately 2–5 seconds
    ↓
autosave latest scene
```

Create:

```http
PATCH /api/v1/projects/{project_id}/scene
```

Payload:

```json
{
  "baseVersion": 37,
  "scene": {}
}
```

Response:

```json
{
  "version": 38,
  "savedAt": "..."
}
```

---

# 13. Optimistic Concurrency

Prevent silent overwrites.

If client edits version:

```text
37
```

but backend is already at:

```text
38
```

return:

```http
409 Conflict
```

Use a stable error:

```json
{
  "error": {
    "code": "SCENE_VERSION_CONFLICT",
    "message": "The project has been updated by another session.",
    "details": {
      "latestVersion": 38
    }
  }
}
```

---

# 14. Scene Schema Migrations

Every scene must include:

```json
{
  "schemaVersion": 1
}
```

Create:

```text
scene/migrations/
```

Example:

```text
v1_to_v2.py
v2_to_v3.py
v3_to_v4.py
```

When loading an old scene:

```text
detect schema version
      ↓
run migration chain
      ↓
return current schema
```

Never silently assume old project data matches the latest application version.

---

# 15. Version Restore

Implement:

```http
GET /api/v1/projects/{project_id}/versions
```

and:

```http
POST /api/v1/projects/{project_id}/versions/{version}/restore
```

Restoring a historical version should create a **new current version** rather than deleting history.

---

# 16. Project Operation Log

Create:

```sql
project_operations
```

Fields:

```text
id
project_id
user_id

actor_type
actor_id

operation
payload JSONB

scene_version_before
scene_version_after

created_at
```

Actors:

```text
human
ai
webmcp
system
```

Examples:

```text
move_furniture
rotate_furniture
change_material
add_room
remove_object
set_lighting
restore_version
```

---

# 17. Assets

Separate:

## HouseSpace system assets

```text
furniture
materials
textures
HDRIs
decor
lighting
```

## User assets

```text
floorplans
PDFs
custom models
reference images
textures
logos
```

Binary data goes to object storage.

Metadata goes to PostgreSQL.

---

# 18. Asset Table

Create:

```sql
assets
```

Suggested fields:

```text
id
workspace_id
owner_user_id

asset_type
category
name

storage_path
mime_type
file_size

metadata JSONB

created_at
```

`metadata` may include:

```json
{
  "dimensions": {
    "width": 2.4,
    "height": 0.82,
    "depth": 0.95
  },

  "style": [
    "modern",
    "warm"
  ],

  "formats": {
    "preview": "...",
    "standard": "...",
    "high": "..."
  }
}
```

---

# 19. Storage Layout

Use organized paths such as:

```text
assets/
  system/
    furniture/
    materials/
    hdri/

  workspaces/
    {workspace_id}/

      uploads/

      projects/
        {project_id}/
          source/
          thumbnails/
          renders/
          exports/
          attachments/
```

Use signed URLs for private content.

Do not proxy large GLBs/textures through FastAPI.

---

# 20. AI Orchestrator

Create a dedicated AI service.

Responsibilities:

```text
model routing
prompt construction
tool schemas
streaming
context selection
token accounting
cost tracking
tool validation
error handling
```

AI should output structured HouseSpace tool calls.

Examples:

```text
create_room
resize_room
move_wall

add_furniture
move_furniture
rotate_furniture
replace_furniture
remove_object

change_material
set_lighting
set_camera
apply_style
```

---

# 21. AI Sessions

Create:

```sql
ai_sessions
```

Fields:

```text
id
project_id
user_id
provider
model
status
created_at
updated_at
```

Create:

```sql
ai_messages
```

Fields:

```text
id
session_id

role
content

tool_name
tool_payload
tool_result

input_tokens
output_tokens
estimated_cost

created_at
```

---

# 22. AI Provider Abstraction

Do not couple the product permanently to one provider.

Create:

```text
AIProvider
```

Implement:

```text
OpenAIProvider
GeminiProvider
```

Create:

```text
AIModelRouter
```

Possible routing:

```text
simple command
→ cheaper model

complex redesign
→ stronger model

floorplan image understanding
→ strong vision model

short text generation
→ inexpensive model
```

---

# 23. WebMCP Integration

WebMCP should act on the same live browser state as the human.

Flow:

```text
Agent
  ↓
WebMCP tool
  ↓
browser scene mutation
  ↓
instant visual update
  ↓
normal autosave
  ↓
FastAPI
  ↓
validation + persistence
```

Do not create a separate WebMCP scene state.

Persistent WebMCP changes must use the normal project save/version flow.

---

# 24. Background Job System

Initially use:

```text
FastAPI
  ↓
Redis
  ↓
Python Worker
```

Use workers for:

```text
floorplan analysis
AI jobs
thumbnail generation
large render jobs
asset optimization
texture processing
emails
cleanup
analytics aggregation
```

Use a practical Redis-backed Python queue such as:

```text
ARQ
RQ
Dramatiq
Celery
```

Choose based on the existing codebase; avoid unnecessary complexity.

---

# 25. Render Jobs

Create:

```sql
render_jobs
```

Fields:

```text
id
project_id
user_id

scene_version_id
camera_id

width
height
quality

status
progress

output_url
error_message

created_at
started_at
completed_at
```

Statuses:

```text
queued
processing
completed
failed
cancelled
```

Create:

```http
POST /api/v1/projects/{project_id}/renders
```

Do not make a normal HTTP request wait synchronously for expensive rendering.

---

# 26. Floorplan Upload Pipeline

Implement conceptually:

```text
upload image/PDF
      ↓
object storage
      ↓
processing job
      ↓
vision/CV/AI
      ↓
structured detection:

rooms
walls
doors
windows
dimensions

      ↓
geometry validator
      ↓
draft scene
      ↓
user confirms
      ↓
canonical project scene
```

AI output should remain a draft until validated.

---

# 27. Public Showcase

Support project visibility:

```text
private
unlisted
public
```

Create:

```sql
public_projects
```

Fields:

```text
project_id
public_slug

title
description
creator_display_name

thumbnail_url

allow_like
allow_share

published_at
```

Public endpoints must never expose:

```text
email
private uploads
workspace members
AI chat history
billing data
internal notes
```

---

# 28. Engagement

Create later:

```text
project_likes
project_shares
project_view_daily
```

For likes:

```text
UNIQUE(project_id, user_id)
```

For view counts, prefer daily aggregation instead of one permanent row for every page hit.

Use Redis for temporary aggregation if needed.

---

# 29. Leaderboard

If the product uses a score such as:

```text
likes × 3
+ views × 1
+ shares × 5
```

do not calculate every score from scratch on every request.

Cache/aggregate periodically.

---

# 30. Billing

Subscriptions belong to the workspace.

Create:

```sql
subscriptions
```

Suggested fields:

```text
id
workspace_id

provider
provider_customer_id
provider_subscription_id

plan
status

current_period_start
current_period_end

created_at
updated_at
```

Possible plans:

```text
Free
Pro
Studio
```

Do not hard-code exact product limits everywhere.

Create a centralized plan/entitlement configuration.

---

# 31. Usage Tracking

Create:

```sql
usage_events
```

Track:

```text
ai_request
vision_request
render
floorplan_import
storage_upload
export
```

Use Redis counters for fast quota checks.

Use Postgres as the durable audit/history source.

---

# 32. Redis

Redis may be used for:

```text
rate limiting
cache
background queue
job progress
AI temporary state
usage counters
leaderboard cache
distributed locks
future presence
```

Redis must never be the only durable copy of a project.

---

# 33. Security Requirements

Implement:

- Supabase JWT verification
- workspace authorization
- project permission checks
- server-side subscription checks
- signed private URLs
- upload validation
- file-size limits
- MIME validation
- Pydantic validation
- scene schema validation
- AI tool validation
- rate limiting
- billing webhook signature verification
- environment-secret handling
- CORS restrictions
- database backups
- structured logging
- Sentry

---

# 34. API Error Format

Use one consistent format:

```json
{
  "error": {
    "code": "PROJECT_ACCESS_DENIED",
    "message": "You do not have permission to edit this project.",
    "details": {}
  }
}
```

Frontend logic should depend on stable error codes, not random error strings.

---

# 35. Observability

Structured request logs should include:

```text
request_id
user_id
workspace_id
project_id
endpoint
status
duration
```

AI logs should include:

```text
provider
model
latency
input tokens
output tokens
estimated cost
tool calls
```

Integrate Sentry.

---

# 36. Product Analytics

Track events such as:

```text
signup
project_created
project_opened
floorplan_uploaded
scene_saved
3d_opened
presentation_opened
ai_used
export_created
project_published
share_clicked
upgrade_clicked
subscription_started
```

Use analytics to make product decisions rather than guessing.

---

# 37. Deployment

Recommended initial production architecture:

```text
Frontend
Vercel

FastAPI
Railway / Render / Fly.io

Postgres
Supabase

Auth
Supabase Auth

Storage
Supabase Storage

Redis
Upstash Redis

Worker
same backend platform initially

Monitoring
Sentry

Analytics
PostHog
```

Do not migrate to complex cloud infrastructure until usage justifies it.

---

# 38. Implementation Phases

## Phase 1 — Persistence foundation

Implement only:

```text
authentication
workspaces
workspace_members
projects
scene snapshots
autosave
optimistic concurrency
scene version history
restore
project operations
```

This is the first milestone.

---

## Phase 2 — Asset foundation

Add:

```text
Supabase Storage
asset metadata
private signed URLs
system asset catalog
user uploads
```

---

## Phase 3 — AI foundation

Add:

```text
AI sessions
AI message history
AI provider abstraction
tool schemas
tool validation
usage/cost tracking
WebMCP operation persistence
```

---

## Phase 4 — Background jobs

Add:

```text
Redis
worker
floorplan analysis
thumbnails
long AI jobs
asset processing
```

---

## Phase 5 — Growth

Add:

```text
public showcase
public slugs
likes
views
shares
leaderboard
billing
usage quotas
```

---

## Phase 6 — Later

Only after user demand:

```text
comments
client review
presence
live collaboration
CRDT
GPU rendering
advanced team roles
```

---

# 39. First Backend Sprint

Implement exactly this first:

### Step 1

Create/adapt:

```text
workspaces
workspace_members
projects
project_scene_versions
project_operations
```

### Step 2

Implement:

```http
POST  /api/v1/projects
GET   /api/v1/projects
GET   /api/v1/projects/{id}
PATCH /api/v1/projects/{id}

GET   /api/v1/projects/{id}/scene
PATCH /api/v1/projects/{id}/scene
```

### Step 3

Connect the existing editor to backend autosave.

### Step 4

Add optimistic version conflict detection.

### Step 5

Add history + restore.

### Step 6

Record human / AI / WebMCP operations.

### Step 7

Test existing projects thoroughly.

STOP here before adding more infrastructure.

---

# 40. Acceptance Criteria for First Milestone

The milestone passes only when:

- existing projects still load
- no sample layout is hard-coded
- scene persists server-side
- autosave works reliably
- autosave does not fire every frame
- stale writes return a conflict
- scene history can be viewed
- an old version can be restored
- restoring does not erase history
- WebMCP changes persist through the same scene flow
- permissions are enforced server-side
- schema migrations are reproducible
- API errors are consistent
- critical save/restore flows have tests
- no major editor performance regression
- refresh does not destroy project work

---

# 41. Required Working Style

Do not make large unverified changes.

For every major step:

1. inspect current code
2. explain what already exists
3. explain what will change
4. explain why
5. identify migration risk
6. implement smallest safe change
7. run the application
8. check console/server errors
9. test current project flow
10. commit only after validation

Prefer incremental migration over rewriting.

---

# 42. What NOT To Build Yet

Do not spend time on:

```text
microservices
Kubernetes
Kafka
custom auth
event sourcing
CRDT collaboration
multi-region DB
GPU render farm
enterprise roles
advanced billing logic
```

until the core project-save workflow is proven.

---

# 43. Final Engineering Principle

Whenever there are two implementation options, prefer the one that:

1. preserves existing project compatibility
2. keeps one canonical scene
3. keeps the browser editor fast
4. makes user work recoverable
5. keeps AI controlled and auditable
6. is simple enough to maintain
7. can be replaced later without rewriting the product

The backend should enable HouseSpace — not become the product's biggest source of complexity.
