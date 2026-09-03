# HouseSpace (HomeSpace.ai) — Design a House With a Human or an AI Agent, in the Same Room

**HouseSpace** is a browser-based architectural design studio where a person and an autonomous AI agent share the exact same canvas, tools, and state. There is no separate "AI sandbox" or disconnected chat window. Every action available to a human in the UI — creating rectangular or L-shaped rooms, carving out alcoves, placing and snapping furniture, switching camera modes, calibrating blueprint overlays, or exporting 3D BIM models — is also an executable WebMCP tool an agent can call directly, in real time, on the live scene graph the human is editing.

*Built for the WebMCP Hackathon (OpenAI).*

---

## Why This Is a Good Fit for WebMCP

Most "AI + design" demos bolt an LLM chat window onto a product and pipe freeform text instructions through a backend API that is disconnected from what the user sees. HouseSpace does the opposite:

- **One shared state, two actors.** The agent calls `document.modelContext` tools that directly mutate the same live React and Three.js scene graph the human is editing. If the agent moves a sectional sofa or carves an L-shaped notch into a bedroom, the human sees the 3D mesh transform immediately — zero polling, no shadow DOM, and no reconciliation step.
- **Structured, not conversational.** All 45 WebMCP tools are strictly schema-constrained (stable UUIDs, explicit coordinate vectors, enum-only materials and camera angles, with feet as the canonical spatial unit). An agent cannot hallucinate invalid geometry or corrupt the floor plan.
- **Confirmation gates on irreversible actions.** Destructive actions (deleting rooms, clearing the scene, wiping projects) and structural exports require an in-page human confirmation boundary (`requiresConfirmation: true`). The agent proposes the action, and the human approves or rejects it via a high-contrast modal.
- **Full parity, not a subset.** All 45 tools mirror actual UI affordances. An agent is not limited to a toy subset — it has the exact same 3D design surface, precision transforms, and full undo/redo stack (`Ctrl+Z` / `Ctrl+Y`) that a human designer enjoys.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run automated tests (single suite)
npm test

# Run all 10 architectural and WebMCP test suites
npm run test:all
```

Open [http://localhost:4173/](http://localhost:4173/) (or the port Vite outputs in your terminal).

---

## Using It as a Human

- **Projects Dashboard** — Launch the app into a modern workspace manager. Create custom projects, search projects with `Ctrl+K`, inspect total square footage and room/furniture counts, duplicate workspaces, or load built-in realistic architectural blueprints (e.g. 4BHK Luxury Residence or 3BHK Apartment Layout).
- **Select & Move** — Click any object on the 3D floor or in the catalog, drag it across the room, or edit precise X/Y/Z coordinates in the Inspector. Edit Width/Height/Depth to resize in real time. Every edit is backed by a bidirectional undo/redo history stack (`Ctrl+Z` / `Ctrl+Y`).
- **Rectangular & L-Shaped Rooms** — Select a room, choose `Above` / `Right` / `Below` / `Left` next to the room `+` button to add an interconnected room with automatic shared-wall gateway cuts. Create non-rectangular spaces by configuring corner notches (NW, NE, SW, SE) and custom alcoves in the Spaces or Inspector panels.
- **CAD Blueprint Overlay & Alignment** — Toggle an interactive blueprint overlay directly above the 3D canvas. Calibrate image scale to real-world feet, adjust transparency via the opacity slider, fine-tune alignment offsets, and switch between 3 view modes (`Combined`, `Geometry Only`, `Blueprint Only`).
- **Autonomous AI Co-Designer** — Open the Agent Copilot drawer to launch 1-click autonomous design goals (such as *"Furnish Master Bedroom"*, *"Redesign Guest Suite"*, *"Add Attached Bath"*, or *"Optimize Living/Dining Flow"*). Watch real-time execution in the **Agent Action Feed** toast notification system.
- **Furniture Catalog & Wall Snapping** — Place procedural PBR furniture into active rooms. Use automated wall clearance snapping (`fit_furniture_to_wall`) and room-wide intelligent layout solvers (`auto_fit_room_furniture`).
- **Multi-Angle Camera Modes** — Seamlessly toggle between:
  - **3D Orbit** — Freely rotate, tilt, and zoom around the entire residence.
  - **2D Architectural CAD** — Orthographic top-down blueprint view or directional elevations (Top, North, East, South, West, Inside wall cutouts).
  - **First-Person Walk** — Immersive walkthrough mode (WASD to walk, mouse/arrows to look, Shift to sprint, ESC to return).
- **Realistic Built-In Layouts** — Test against authentic multi-room floor plans out of the box:
  - **4BHK Luxury Apartment** (`Sample_1.png`): 2,320 sq ft layout featuring master, son, daughter, and guest suites with attached baths, walk-in closets, pooja room, kitchen, utility, store, expansive living/dining, and viewing balcony.
  - **3BHK Residence Layout** (`Sample_2.png`): 975 sq ft optimized apartment with interconnected bedroom suites, wash, store, and deck area.

---

## WebMCP Tools (45 Tools Total)

Forty-four tools cover the full design surface, grouped by functional domain. For full schema definitions, parameter tables, and usage examples, refer to [WEBMCP_TOOLS.md](file:///e:/HomeSpace.ai/WEBMCP_TOOLS.md).

| Category | Count | Tools |
| :--- | :---: | :--- |
| **Rooms** | 9 | `create_room`, `add_connected_room`, `fit_room_into_notch`, `rename_room`, `move_room`, `set_room_dimensions`, `delete_room`, `connect_rooms`, `disconnect_rooms` |
| **Structure** | 5 | `add_wall`, `set_wall_dimensions`, `place_door`, `place_window`, `change_ceiling_height` |
| **Objects** | 10 | `add_furniture`, `move_object`, `rotate_object`, `scale_object`, `delete_object`, `set_transform_lock`, `set_furniture_dimensions`, `fit_furniture_to_wall`, `auto_fit_room_furniture`, `get_furniture_catalog` |
| **Materials** | 2 | `apply_material`, `change_texture` |
| **Scene / View** | 6 | `generate_floor_plan`, `switch_view`, `take_screenshot`, `get_scene_state`, `select_item`, `set_grid_snap` |
| **Workflow** | 11 | `undo`, `redo`, `export_model`, `set_confirmation_policy`, `create_project`, `open_project`, `list_projects`, `delete_project`, `duplicate_project`, `load_sample_project`, `clear_scene` |
| **CAD Synthesis** | 1 | `build_3d_from_cad` |

All schemas use stable object and room IDs, **feet** as the canonical unit (converted to SI metres internally for Three.js), explicit `{x, y, z}` vectors, enum-constrained fields, and confirmation flags on structural edits and exports. `get_scene_state` returns complete scene ground truth — polygon footprints, wall cutouts, connection gateways, and object transforms.

### Example Tool Calls

```javascript
// 1. Create a connected study room with explicit feet dimensions
await tools.call('create_room', {
  name: 'Study',
  width: 10,
  depth: 12,
  position: { x: 4, y: 0, z: 2 }
});

// 2. Fit a new ensuite washroom into an architectural corner notch
await tools.call('fit_room_into_notch', {
  parentRoomId: 'room-bed-1',
  newRoomName: 'Ensuite Washroom',
  notchCorner: 'NE',
  notchWidth: 5,
  notchDepth: 6
});

// 3. Move and snap a sofa in real time
await tools.call('move_object', {
  objectId: 'obj-sofa-sectional-01',
  position: { x: -2, y: 0, z: 1 }
});

// 4. Switch camera to 2D architectural CAD plan
await tools.call('switch_view', { mode: '2d', angle: 'top' });
```

---

## Agent Connectivity

Click the **Agent bridge ready / WebMCP connected** pill in the top header for live connection status, discovered tool count, and a copy-pasteable starter prompt.

1. **Native WebMCP Host**: Tools register natively on `document.modelContext` — zero glue code required.
2. **Standard Browser Fallback**: The identical tool suite is exposed globally via `window.housespaceAgent`:
   ```javascript
   await window.housespaceAgent.callTool('create_room', { name: 'Study', width: 10, depth: 12 });
   const state = await window.housespaceAgent.callTool('get_scene_state', {});
   ```
3. **Event-Based Integrations**: Dispatch `{ name, input, requestId }` on the `housespace:agent-call` (or `forma:agent-call`) DOM event and listen for the matching `housespace:agent-result`.

All pathways execute on the active page origin, keeping the human and agent in perfect visual synchrony.

---

## Deterministic 2D CAD/Floor-Plan to 3D Reconstruction

HouseSpace features an accurate, deterministic reconstruction pipeline that converts 2D blueprints (PNG, JPG, SVG, CAD) into mathematically faithful 3D spaces instead of approximate AI interpretations:

```text
2D CAD/Image → Geometry Extraction & Calibration → Structured 2D Model → Validation → Deterministic 3D Reconstruction → Constrained AI Interior Design
```

### Core Capabilities

1. **Structural Accuracy First, Interior Design Second**:
   - **Dimension Annotation Parsing**: Recognizes printed blueprint dimensions (e.g. `17'-0" X 18'-0"`, `12'-0" X 10'-0"`, `5'-0" X 9'-9"`) and calibrates pixel scale to real-world feet.
   - **Structured 2D FloorPlan Model** (`src/types/floorPlan.ts`): Canonical internal representation with explicit wall thickness (0.5 ft exterior, 0.4 ft interior), closed polygonal rooms, and parametric opening locations.
   - **Separation of Geometry and Semantics**: Geometry is derived deterministically from the source drawing; AI agents handle semantic room labeling and interior furnishing without hallucinating wall coordinates.

2. **Non-Rectangular Polygonal Floor Geometry** (`src/geometry/roomGeometry.ts`):
   - Polygon footprint decomposition supporting 4-corner boxes and 6- to 8-vertex L-shaped rooms with corner notches and alcoves.
   - Wall extrusion with concave vertex awareness, correct mitered wall joins, and accurate doorway/gate cutouts.

3. **Deterministic 3D Reconstruction** (`src/geometry/deterministicReconstruction.ts`):
   - 2D room polygons $\rightarrow$ 3D extruded polygonal floors (`THREE.ShapeGeometry`).
   - 2D wall segments $\rightarrow$ 3D extruded walls with accurate cutouts for doors (headers/lintels) and windows (sills, headers, glazing).
   - Topological door and gate connections preserving room circulation.

4. **Geometry Validation Engine** (`src/geometry/geometryValidator.ts`):
   - Verifies polygon closure, overlapping walls, opening boundaries, and dimension tolerances.
   - Computes a real-time **Geometry Confidence Score** (0–100%) visible directly in the UI.

5. **2D Verification Overlay & Top-Down Camera Alignment**:
   - **Interactive Overlay Modes**: Switch between `Combined` (transparent blueprint with detected geometry), `Geometry Only`, and `Blueprint Only`.
   - **1:1 Top-Down Projection**: Top-down camera view in 3D matches the 2D CAD coordinates exactly for visual regression verification.

6. **Constrained AI Interior Furnishing** (`src/geometry/constrainedFurniture.ts`):
   - Places furniture inside room boundaries with perimeter wall clearance, avoiding door swing arcs and window access corridors.

---

## Comprehensive Automated Test Suite (10 Test Suites)

HomeSpace includes a full automated test runner validating geometry, state persistence, CAD reconstruction, and WebMCP protocol compliance:

```bash
npm run test:all
```

| # | Test Suite | File | What It Verifies |
| :-: | :--- | :--- | :--- |
| **1** | **Room Creation & Auto-Snap Gateway Fix** | `tests/test_room_creation_fix.ts` | Standalone room creation, edge snapping, shared wall overlap prevention, doorway cuts, and undo/redo history. |
| **2** | **L-Shaped Rooms & Notch Geometry** | `tests/test_l_shaped_rooms.ts` | Non-rectangular room creation, 6-vertex polygon footprints, notch cuts (NW/NE/SW/SE), and wall helper edge generation. |
| **3** | **Wall Alcoves, Outward Wings & Edge Alignment** | `tests/test_alcoves_and_alignment.ts` | 8-vertex wall alcoves, outward wing extensions, and multi-room edge collinearity. |
| **4** | **Furniture Dimension & Wall Snapping Tools** | `tests/test_furniture_dimension_tools.ts` | `set_furniture_dimensions`, `fit_furniture_to_wall`, and wall clearance snapping. |
| **5** | **WebMCP Architecture & Bridge Audit** | `tests/test_webmcp_audit.ts` | Imperative API (`document.modelContext`), JSON Schema validation, tool count (45 tools), and event dispatching. |
| **6** | **Project Workspace & State Management** | `tests/test_project_system.ts` | `projectStore` lifecycle, IndexedDB storage, multi-project persistence, and active workspace switching. |
| **7** | **Project Deletion Workflow** | `tests/test_delete_project.ts` | Project deletion, storage cleanup, confirmation boundary, and fallback to default workspaces. |
| **8** | **CAD Blueprint to 3D Plan Builder** | `tests/test_cad_to_3d.ts` | Deterministic CAD topology extraction, scale calibration, and autonomous 3D room/opening reconstruction. |
| **9** | **Floor Plan Accuracy & Constraint Solving** | `tests/test_floorplan_accuracy.ts` | Dimensional accuracy against blueprint measurements, and constraint-based furniture placement. |
| **10** | **Agent-Built Guest Suite Validation** | `tests/validate_layout.ts` | End-to-end integration test of autonomous suite creation with interconnected bath and furnishings. |

---

## Export & CAD Interoperability

`export_model` produces:
- **GLB / OBJ** — 3D mesh geometry with material textures for rendering in Blender, Unreal Engine, or Unity.
- **IFC4 (BIM)** — Structure-first Industry Foundation Classes package with semantic room, wall, door, and window metadata for Revit, Archicad, and standard CAD workflows.
- **JSON** — Full parametric scene graph representation for persistence and pipeline interchange.

Exports run strictly after human approval in the confirmation modal.

---

## Architecture at a Glance

- **React 18** — Projects dashboard, glassmorphism studio panels, categorized inspector, materials palette, and responsive modals.
- **Three.js** — 3D canvas, lighting, shadow maps, multi-mode camera system (3D Orbit, 2D Top/Elevations, 1st-Person Walk), and procedural PBR furniture meshes.
- **State Architecture (Zustand)** — Decoupled stores for scene geometry (`sceneStore`), project persistence (`projectStore`), UI controls (`uiStore`), undo/redo history (`historyStore`), and agent telemetry (`agentStore`).
- **IndexedDB Storage Layer** (`src/storage/indexedDBStorage.ts`) — Reliable browser-local persistence for multiple projects, thumbnails, and custom blueprint assets.
- **Deterministic Geometry Engine** (`src/geometry/`) — Pure algorithmic modules for polygon footprints, notch cuts, topological validation, and wall join synthesis.
- **WebMCP Tool Registry** (`src/webmcp/registry.ts`, `src/webmcp/bridge.ts`) — Single source of truth exposing 45 validated tools to `document.modelContext`, global window hooks, and custom events.
- **Autonomous AI Co-Designer & Action Feed** — Interactive copilot drawer with preset architectural goals, natural language intent parser, and real-time toast feedback.

---

## Roadmap

- Multi-level floors and stacked staircases
- Native DXF / DWG binary vector parser
- Measurement dimension annotations in 1st-person walk mode
- Cloud synchronization and real-time multi-human collaboration
- Lighting presets & real-time raytraced shadows
