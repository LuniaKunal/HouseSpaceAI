# HouseSpace — Design a House With a Human or an AI Agent, in the Same Room

**HouseSpace** is a browser-based house design studio where a person and an AI agent share the exact same canvas, tools, and state. There's no separate "AI mode." Every action available to a human in the UI — creating a room, moving furniture, switching camera views, exporting a model — is also a WebMCP tool an agent can call directly, in real time, on the page the human is already looking at.

*Built for the WebMCP Hackathon (OpenAI).*

---

## Why This Is a Good Fit for WebMCP

Most "AI + app" demos bolt a chat window onto a product and pipe instructions through a backend API that's disconnected from what the user sees. HouseSpace does the opposite:

- **One shared state, two actors.** The agent calls `document.modelContext` tools that mutate the same React/Three.js scene graph the human is editing. If the agent moves a sofa, the human sees it move — no polling, no separate "AI view," no reconciliation step.
- **Structured, not conversational.** Tools are schema-constrained (stable IDs, explicit vectors, enum-only materials/views, feet as the canonical unit) so an agent can't hallucinate a plausible-sounding but invalid edit. This is a deliberate contrast to prompting an LLM to "just write some JSON."
- **Confirmation gates on irreversible actions.** Structural edits and exports require an in-page human confirmation step — the agent proposes, the human can approve. This is the trust boundary WebMCP is meant to make possible: agent autonomy with a human still in the loop where it matters.
- **Full parity, not a subset.** All 38 tools mirror actual UI affordances. An agent isn't limited to a toy sandbox of what the app could do — it has the same 3D design surface a human designer does, including undo/redo.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:4173/](http://localhost:4173/) (or the port Vite prints).

---

## Using It as a Human

- **Select & move** — Click an object in the canvas or catalog, drag it on the floor, or edit X/Y/Z in the inspector for precise placement. Edit W/H/D to resize. Every edit is undo/redo-able (`Ctrl+Z` / `Ctrl+Y`).
- **Rooms** — Select a room, choose `Above` / `Right` / `Below` / `Left` next to the room `+` button to add a connected room; a shared-wall gate is created automatically. Rename, resize, lock, connect, or delete rooms from the Spaces/Inspector panels.
- **Furniture** — With a room selected, catalog items are placed into that room.
- **Camera** — **3D** (orbit/zoom), **2D** (Top / North / East / South / West / Inside wall view), and **Walk** (first-person: WASD to move, mouse/arrows to turn, Shift to sprint, ESC to exit).
- **Starting point** — The default scene is a furnished 3D interpretation of a realistic luxury apartment plan: master, son, guest, and daughter bedrooms with attached toilets and walk-ins; dining, kitchen, utility, store, pooja room, living area, and balcony. It's a realistic, non-trivial layout on purpose — it's what makes *"have the agent redesign the guest bedroom"* a meaningful test rather than a toy example.

---

## WebMCP Tools (35 Tools Total)

Thirty-five tools cover the full design surface, grouped by what they touch:

| Category | Tools |
| :--- | :--- |
| **Rooms** | `create_room`, `rename_room`, `move_room`, `set_room_dimensions`, `delete_room`, `connect_rooms` |
| **Structure** | `add_wall`, `set_wall_dimensions`, `place_door`, `place_window`, `change_ceiling_height`, `build_3d_from_cad` |
| **Objects** | `add_furniture`, `move_object`, `rotate_object`, `scale_object`, `set_furniture_dimensions`, `fit_furniture_to_wall`, `auto_fit_room_furniture`, `delete_object`, `set_transform_lock` |
| **Materials** | `apply_material`, `change_texture` |
| **Scene / View** | `generate_floor_plan`, `switch_view`, `take_screenshot`, `get_scene_state` |
| **Workflow** | `undo`, `redo`, `export_model`, `set_confirmation_policy`, `create_project`, `open_project`, `list_projects`, `delete_project` |

All schemas use stable object/room IDs, **feet** as the canonical unit (converted to metres internally for Three.js), explicit `{x, y, z}` vectors, enum-constrained fields for materials and views, and confirmation flags on structural edits and exports. `get_scene_state` returns the full source of truth — rooms, objects, connection gates, and measurements — so an agent can always ground its next call in current reality instead of assuming.

### Example Tool Calls

```javascript
// Create a connected study room
await tools.call('create_room', {
  name: 'Study',
  width: 10,
  depth: 12,
  position: { x: 4, y: 0, z: 2 }
});

// Move a sofa in real-time
await tools.call('move_object', {
  objectId: 'obj-sofa-sectional-01',
  position: { x: -2, y: 0, z: 1 }
});

// Switch camera to 2D architectural CAD plan
await tools.call('switch_view', { mode: '2d', angle: 'top' });
```

---

## Agent Connectivity

Click the **Agent bridge ready / WebMCP connected** pill in the header for live connection status, tool count, and a copy-pasteable starter prompt.

1. **In a WebMCP-capable host**, tools register natively on `document.modelContext` — no integration code needed.
2. **In a regular browser**, the same tool set is exposed via `window.housespaceAgent`:
   ```javascript
   await window.housespaceAgent.callTool('create_room', { name: 'Study', width: 10, depth: 12 });
   const state = await window.housespaceAgent.callTool('get_scene_state', {});
   ```
3. **Event-based integrations** can dispatch `{ name, input, requestId }` on `housespace:agent-call` (or `forma:agent-call`) and listen for the matching `housespace:agent-result`.

Either path keeps agent calls on the page origin and mutates the same state a human sees — there is no shadow copy of the scene.

---

## Deterministic 2D CAD/Floor-Plan to 3D Reconstruction

HouseSpace features an accurate, deterministic reconstruction pipeline that converts 2D blueprints (PNG, JPG, SVG, CAD) into mathematically faithful 3D spaces instead of approximate AI interpretations:

```text
2D CAD/Image → Geometry Extraction & Calibration → Structured 2D Model → Validation → Deterministic 3D Reconstruction → Constrained AI Interior Design
```

### Core Pipeline Capabilities

1. **Structural Accuracy First, Interior Design Second**:
   - **Dimension Annotation Parsing**: Recognizes printed blueprint dimensions (e.g. `17'-0" X 18'-0"`, `12'-0" X 10'-0"`, `10'-0" X 10'-0"`, `5'-0" X 9'-9"`) and calibrates pixel scale to real-world feet.
   - **Structured 2D FloorPlan Model** (`src/types/floorPlan.ts`): Canonical internal representation with explicit wall thickness (0.5 ft exterior, 0.4 ft interior), closed polygonal rooms, and parametric opening locations.
   - **Separation of Geometry and Semantics**: Geometry is derived deterministically from the source drawing; AI agents are responsible for semantic labeling and interior styling without hallucinating arbitrary wall coordinates.

2. **Deterministic 3D Reconstruction** (`src/geometry/deterministicReconstruction.ts`):
   - 2D room polygons $\rightarrow$ 3D extruded polygonal floors (`THREE.ShapeGeometry`).
   - 2D wall segments $\rightarrow$ 3D extruded walls with accurate cutouts for doors (headers/lintels) and windows (sills, headers, glazing).
   - Topological door and gate connections preserving room circulation.

3. **Geometry Validation Engine** (`src/geometry/geometryValidator.ts`):
   - Verifies polygon closure, duplicate or overlapping walls, opening boundaries, and dimension tolerances.
   - Computes a real-time **Geometry Confidence Score** (0–100%) visible directly in the UI.

4. **2D Verification Overlay & Top-Down Camera Alignment**:
   - **Interactive Overlay Modes**: Switch between `Combined` (transparent blueprint with detected geometry), `Geometry Only`, and `Blueprint Only`.
   - **1:1 Top-Down Projection**: Top-down camera view in 3D matches the 2D CAD coordinates exactly for visual regression verification.

5. **Constrained AI Interior Furnishing** (`src/geometry/constrainedFurniture.ts`):
   - Places furniture inside room boundaries with perimeter wall clearance, avoiding door swing arcs and window access corridors.

---

## Export

`export_model` produces **GLB** or **OBJ** geometry, or a structure-first **IFC4** package with room/object metadata — usable downstream in real CAD/BIM tools, not just a screenshot. Exports run only after the in-page human confirmation gate.

---

## Architecture at a Glance

- **React** — UI, panels, inspector, spaces manager, materials palette, undo/redo history.
- **Three.js** — 3D canvas, lighting, shadow maps, camera modes (3D Orbit, 2D Top/Elevations, 1st-Person Walk), procedural PBR furniture meshes.
- **Deterministic Geometry Engine** (`src/geometry/`) — Deep modules for blueprint extraction, topological validation, polygonal 3D reconstruction, and constrained furniture placement.
- **document.modelContext.registerTool** — WebMCP tool registration, the single source of truth both the UI and the agent call into.
- **window.formaAgent / forma:agent-call events** — Fallback bridge for non-WebMCP hosts.
- **Autonomous AI Co-Designer Drawer** — Built-in interactive agent with 1-click autonomous design task goals, natural language intent parser, and real-time execution logs.

---

## Roadmap

- Multi-level floors and stacked stairs
- Native DXF / DWG binary vector parser
- Measurement dimension annotations in walk mode
- Project persistence & cloud synchronization
- Lighting presets & real-time raytraced shadows

