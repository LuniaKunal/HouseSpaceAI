# HouseSpace WebMCP Tools Reference Guide

> **W3C WebMCP Specification & Agent Interoperability Guide**  
> **Total Available Tools:** 44 Executable Tools  
> **Categories:** 7 (Rooms, Structure, Objects, Materials, Scene / View, Workflow, CAD Synthesis)  
> **Canonical Spatial Units:** Feet (Imperial) for dimensions and coordinates; degrees for Euler rotation; Three.js converts to SI metres internally ($1\text{ ft} = 0.3048\text{ m}$).

---

## 1. WebMCP Architecture Overview

HouseSpace is built from the ground up to support collaborative spatial design where a human designer and an autonomous AI agent share the **exact same live scene graph** in real time.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Agent / WebMCP Host                          │
└──────────────┬───────────────────┬───────────────────┬─────────────────┘
               │ (Standard W3C)    │ (Global Bridge)   │ (Custom Events)
               ▼                   ▼                   ▼
   document.modelContext   window.housespaceAgent   housespace:agent-call
               │                   │                   │
               └───────────────────┼───────────────────┘
                                   ▼
                    WebMCP Central Tool Registry
                     (44 Schema-Validated Tools)
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
     Confirmation Boundary                    Scene & UI Stores
  (Human approval for destructive           (Zustand + Three.js +
   actions: delete/export/clear)             React 3D Viewport)
```

### Key Architectural Principles

1. **True Shared State (No Shadow DOM or Sandboxes):**  
   Every WebMCP tool mutates the actual live Zustand stores (`sceneStore`, `projectStore`, `uiStore`). When an agent adds a room or translates a sofa, the user immediately sees the mesh animate and render in the 3D Three.js canvas.

2. **Schema-Constrained Parameters:**  
   Every tool is registered with strict JSON Schema definitions. Arbitrary string coordinates or hallucinated options are rejected before hitting the scene graph.

3. **Human-in-the-Loop Trust Boundaries:**  
   Destructive or irreversible tools require explicit human approval via the in-app confirmation modal (`requiresConfirmation: true`). Agents cannot delete entire rooms, wipe scenes, or trigger external BIM downloads without the designer pressing "Approve".

4. **Bi-directional Discovery & Telemetry:**  
   Tools can be discovered dynamically using standard `document.modelContext.getTools()` and listen to the `toolchange` EventTarget event. Every call is logged in the studio telemetry and agent history audit trail.

---

## 2. Calling WebMCP Tools

### Method A: Standard W3C WebMCP (`document.modelContext`)
```javascript
// 1. Discover all tools
const tools = await document.modelContext.getTools();
console.log(`Available WebMCP tools: ${tools.length}`);

// 2. Query available furniture in the catalog
const catalog = await tools.find(t => t.name === 'get_furniture_catalog').execute({ category: 'seating' });

// 3. Find and execute a tool directly
const createRoom = tools.find(t => t.name === 'create_room');
const result = await createRoom.execute({
  name: 'Master Bedroom',
  width: 16,
  depth: 14,
  floorMaterial: 'hardwood_walnut',
  position: { x: 0, y: 0, z: 0 }
});
```

### Method B: Browser Global Bridge (`window.housespaceAgent`)
```javascript
// Direct invocation by tool name
const result = await window.housespaceAgent.callTool('add_furniture', {
  type: 'bed_king',
  roomId: result.roomId,
  position: { x: 0, y: 0, z: -2 }
});

// Ground agent in current ground truth
const sceneState = await window.housespaceAgent.getSceneState();
```

### Method C: Custom DOM Event Bridge
```javascript
window.dispatchEvent(new CustomEvent('housespace:agent-call', {
  detail: {
    requestId: 'req-1234',
    name: 'switch_view',
    input: { mode: '2d', angle: 'top' }
  }
}));

window.addEventListener('housespace:agent-result', (event) => {
  if (event.detail.requestId === 'req-1234') {
    console.log('Result:', event.detail.result);
  }
});
```

---

## 3. Master WebMCP Tool Catalog Summary (46 Tools)

| # | Category | Tool Name | Human Confirmation | Description Summary |
|---|:---|:---|:---:|:---|
| 1 | **Rooms** | `create_room` | No | Creates a new rectangular, L-shaped, or alcove room space |
| 2 | **Rooms** | `add_connected_room` | No | Adds room snapped to an existing room with alignment & doorway gate |
| 3 | **Rooms** | `add_wall_alcove` | No | Adds middle-wall alcove (inward recess or outward wing) to room |
| 4 | **Rooms** | `set_room_notch` | No | Configures, adjusts corner/dimensions, or unsets L-shaped notch |
| 5 | **Rooms** | `fit_room_into_notch` | No | Nests ensuite/closet into the cutout notch of an L-room |
| 6 | **Rooms** | `rename_room` | No | Updates display label of a room |
| 7 | **Rooms** | `move_room` | No | Translates room and enclosed objects to new (x, z) coordinates |
| 8 | **Rooms** | `set_room_dimensions` | No | Resizes width, depth, height, or notch parameters |
| 9 | **Rooms** | `delete_room` | ⚠️ **Required** | Deletes room, openings, and enclosed furniture |
| 10 | **Rooms** | `connect_rooms` | No | Snaps rooms flush and cuts shared doorway opening |
| 11 | **Rooms** | `disconnect_rooms` | No | Removes shared opening and restores solid partition wall |
| 12 | **Structure** | `add_wall` | No | Creates interior partition wall segment {start, end} |
| 11 | **Structure** | `set_wall_dimensions` | No | Adjusts wall thickness, length, or height |
| 12 | **Structure** | `place_door` | No | Places standard, sliding, double, pocket, or arch door |
| 13 | **Structure** | `place_window` | No | Places glazed exterior/interior window with sill elevation |
| 14 | **Structure** | `change_ceiling_height` | No | Adjusts ceiling height globally or for a specific room |
| 15 | **Objects** | `add_furniture` | No | Places 3D furniture item at coordinates with validation |
| 16 | **Objects** | `move_object` | No | Translates furniture piece in scene feet |
| 17 | **Objects** | `rotate_object` | No | Rotates furniture piece (Euler degrees, yaw on Y) |
| 18 | **Objects** | `scale_object` | No | Scales object along {x, y, z} axes |
| 19 | **Objects** | `delete_object` | No | Deletes specific furniture item from scene |
| 20 | **Objects** | `set_transform_lock` | No | Locks/unlocks room or furniture against accidental edits |
| 21 | **Objects** | `set_furniture_dimensions` | No | Sets precise width, height, and depth dimensions in feet |
| 22 | **Objects** | `fit_furniture_to_wall` | No | Resizes/snaps oversized furniture flush against adjacent wall |
| 23 | **Objects** | `auto_fit_room_furniture` | No | Batch detects & auto-resizes oversized furniture in a room |
| 24 | **Objects** | `get_furniture_catalog` | No | Discovers all 32 human catalog items, dimensions, and materials |
| 25 | **Materials** | `apply_material` | No | Applies architectural material/color to floor, wall, or object |
| 26 | **Materials** | `change_texture` | No | Updates PBR texture mapping (roughness, scale, metalness) |
| 27 | **Scene / View** | `generate_floor_plan` | No | Switches to 2D CAD blueprint view with dimensions |
| 28 | **Scene / View** | `switch_view` | No | Switches viewport camera between 3D, 2D, and Walk modes |
| 29 | **Scene / View** | `take_screenshot` | No | Captures viewport canvas as high-res PNG or JPEG |
| 30 | **Scene / View** | `get_scene_state` | No | Grounding query returning all rooms, objects, and metrics |
| 31 | **Scene / View** | `select_item` | No | Selects item in viewport and opens property inspector |
| 32 | **Scene / View** | `set_grid_snap` | No | Configures grid snapping state and increment in feet |
| 33 | **Workflow** | `undo` | No | Reverts last design modification |
| 34 | **Workflow** | `redo` | No | Re-applies undone design modification |
| 35 | **Workflow** | `export_model` | ⚠️ **Required** | Exports scene to GLB, OBJ, IFC4 (BIM), or JSON format |
| 36 | **Workflow** | `set_confirmation_policy` | No | Configures human-in-the-loop trust boundary & whitelists |
| 37 | **Workflow** | `create_project` | No | Creates new workspace with optional CAD upload & synthesis |
| 38 | **Workflow** | `open_project` | No | Loads existing project workspace by ID |
| 39 | **Workflow** | `list_projects` | No | Lists all saved user projects with metadata |
| 40 | **Workflow** | `delete_project` | ⚠️ **Required** | Permanently deletes project workspace |
| 41 | **Workflow** | `duplicate_project` | No | Clones current project into duplicate copy |
| 42 | **Workflow** | `load_sample_project` | No | Loads pre-built '3BHK_Sample' or '4BHK_Sample' |
| 43 | **Workflow** | `clear_scene` | ⚠️ **Required** | Clears all rooms, walls, and furniture from canvas |
| 44 | **CAD** | `build_3d_from_cad` | No | Deterministic 3D reconstruction from 2D CAD blueprint image |

---

## 4. Comprehensive Tool Reference by Category

### Category 1: Rooms (11 Tools)

#### `create_room`
* **Title:** Create Room
* **Requires Confirmation:** `false`
* **Description:** Creates a new architectural room space on the floor plan with custom dimensions, position, and floor material. Automatically positions non-overlapping standalone rooms when position is omitted. Supports L-shaped rooms via corner notch cutout, and middle-wall alcoves / wing extensions.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `name` | `string` | Yes | — | Display name of the room (e.g. `Living Room`, `Study`) |
  | `width` | `number` | Yes | — | Width of room in feet |
  | `depth` | `number` | Yes | — | Depth of room in feet |
  | `height` | `number` | No | `9.5` | Ceiling height of room in feet |
  | `position` | `object` `{ x, y?, z }` | No | Auto-placed | Center position in 3D scene feet |
  | `floorMaterial` | `enum` | No | `hardwood_oak` | Options: `hardwood_oak`, `hardwood_walnut`, `marble_carrara`, `marble_nero`, `terrazzo`, `concrete_polished`, `ceramic_tile`, `carpet_plush`, `herringbone_wood` |
  | `wallColor` | `string` | No | `#f8fafc` | Hex color code for walls |
  | `notch` | `object` `{ corner, width, depth }` | No | `null` | Cutout notch for L-shaped room. `corner`: `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` |
  | `connectedTo` | `object` `{ roomId, direction, openingWidth? }` | No | `null` | Optional reference room attachment |
* **Output:** `{ success: true, roomId, name, dimensions: { width, depth, height }, position, notch, footprint, areaSqFt }`
* **Example:**
  ```json
  {
    "name": "Master Suite",
    "width": 18,
    "depth": 16,
    "floorMaterial": "hardwood_walnut",
    "notch": {
      "corner": "top-right",
      "width": 6,
      "depth": 6
    }
  }
  ```

---

#### `add_connected_room`
* **Title:** Add Connected Room
* **Requires Confirmation:** `false`
* **Description:** Creates a new room attached directly to an existing reference room in a cardinal direction (`above`, `right`, `below`, `left`) with automatic shared wall alignment, doorway gate, and optional corner notch cutout.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `referenceRoomId` | `string` | Yes | — | ID of the existing room to attach to |
  | `direction` | `enum` | Yes | — | Cardinal attachment direction: `'above'` \| `'right'` \| `'below'` \| `'left'` |
  | `name` | `string` | Yes | — | Display name of the new room (e.g. `Kitchen`, `Balcony`) |
  | `width` | `number` | No | `12` | Width of new room in feet |
  | `depth` | `number` | No | `12` | Depth of new room in feet |
  | `floorMaterial` | `enum` | No | `hardwood_oak` | Material enum identifier |
  | `openingWidth` | `number` | No | `4.0` | Doorway gate opening width in feet |
  | `alignment` | `enum` / `number` | No | `center` | Alignment along wall: `'start'` (top/left), `'center'`, `'end'` (bottom/right), or numeric offset in feet |
  | `notch` | `object` | No | `null` | Cutout notch for L-shaped room `{ corner, width, depth }` |
  | `alcove` | `object` | No | `null` | Middle-wall alcove or wing `{ edge, type, offset, width, depth }` |
* **Output:** `{ success: true, roomId, name, dimensions, position, notch, alcove, footprint, connectedTo, direction, gateId, areaSqFt }`

---

#### `add_wall_alcove`
* **Title:** Add Wall Alcove or Wing Extension
* **Requires Confirmation:** `false`
* **Description:** Adds a middle-wall alcove (inward recess or outward protrusion/wing extension) along any wall edge of an existing room, creating an 8-vertex orthogonal architectural layout (e.g. entryway foyer, hallway vestibule, or entertainment niche).
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | ID of the room to add the alcove or extension to |
  | `edge` | `enum` | Yes | — | Which wall edge contains the alcove: `'north'`, `'south'`, `'east'`, `'west'` |
  | `type` | `enum` | Yes | — | `'recess'` = inward cutout into room; `'protrusion'` = outward extension/wing out of room |
  | `offset` | `number` | No | `0` | Distance in feet from start of wall edge |
  | `width` | `number` | Yes | — | Span along the wall in feet |
  | `depth` | `number` | Yes | — | Depth inward or outward in feet |
* **Output:** `{ success: true, roomId, name, alcove, footprint, areaSqFt }`

---

#### `fit_room_into_notch`
* **Title:** Fit Room into Cutout Notch
* **Requires Confirmation:** `false`
* **Description:** Creates a secondary room (e.g. ensuite bathroom, walk-in closet, pantry) that snugly fits inside the corner notch cutout of an L-shaped parent room, and connects them with an interior doorway gate.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `parentRoomId` | `string` | Yes | — | ID of the L-shaped parent room containing the cutout notch |
  | `name` | `string` | Yes | — | Display name for the nested room (e.g. `Ensuite Bathroom`, `Walk-in Closet`) |
  | `floorMaterial` | `enum` | No | `ceramic_tile` | Floor surface material texture |
  | `openingWidth` | `number` | No | `2.5` | Doorway gate opening width in feet |
* **Output:** `{ success: true, roomId, name, dimensions, position, parentRoomId, gateId, areaSqFt }`

---

#### `set_room_notch`
* **Title:** Set or Adjust Room Notch (L-Shape)
* **Requires Confirmation:** `false`
* **Description:** Configures, adjusts, or removes the corner cutout notch of an architectural room to convert it into an L-shaped room, adjust cutout dimensions/corner, or revert to a standard rectangle. Optionally nests an attached space (e.g. bathroom/closet) inside the newly configured notch.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | ID of the room to configure or adjust |
  | `enabled` | `boolean` | No | `true` | Set to `false` to remove notch and convert room back to rectangle |
  | `corner` | `enum` | No | `'bottom-right'` | Cutout corner: `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'` |
  | `width` | `number` | No | `w / 2` | Width of cutout in feet (must be less than room width) |
  | `depth` | `number` | No | `d / 2` | Depth of cutout in feet (must be less than room depth) |
  | `nestAttachedSpace` | `object` | No | `null` | Optional child space to automatically fit inside cutout `{ name, floorMaterial?, openingWidth? }` |
* **Output:** `{ success: true, roomId, name, isLShaped, notch, footprint, dimensions, areaSqFt, nestedRoom? }`
* **Example:**
  ```json
  {
    "roomId": "room-master",
    "corner": "top-right",
    "width": 5,
    "depth": 6,
    "nestAttachedSpace": {
      "name": "Ensuite Bath",
      "floorMaterial": "ceramic_tile"
    }
  }
  ```

---

#### `rename_room`
* **Title:** Rename Room
* **Requires Confirmation:** `false`
* **Description:** Renames an existing room by its stable room ID.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Stable ID of the room (e.g. `room-living`) |
  | `newName` | `string` | Yes | — | New display name for the room |
* **Output:** `{ success: true, roomId, newName }`

---

#### `move_room`
* **Title:** Move Room
* **Requires Confirmation:** `false`
* **Description:** Translates a room and all enclosed furniture to a new `{x, y, z}` position in feet.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Stable ID of the room |
  | `position` | `object` `{ x, y, z }` | Yes | — | New center coordinates in feet |
* **Output:** `{ success: true, roomId, position }`

---

#### `set_room_dimensions`
* **Title:** Set Room Dimensions
* **Requires Confirmation:** `false`
* **Description:** Resizes the width, depth, or ceiling height of an existing room in feet, and optionally adds or modifies an L-shaped corner notch.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Stable ID of the room |
  | `width` | `number` | Yes | — | New width in feet |
  | `depth` | `number` | Yes | — | New depth in feet |
  | `height` | `number` | No | Current | Optional new ceiling height in feet |
  | `notch` | `object` | No | Current | Corner cutout notch `{ corner, width, depth }` or `null` to remove notch |
* **Output:** `{ success: true, roomId, width, depth, height, notch, footprint, areaSqFt }`

---

#### `delete_room`
* **Title:** Delete Room
* **Requires Confirmation:** ⚠️ **`true`**
* **Description:** Deletes a room and cleans up all enclosed furniture, connection gates, and wall openings.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Stable ID of the room to delete |
* **Output:** `{ success: true, deletedRoomId, deletedRoomName }`

---

#### `connect_rooms`
* **Title:** Connect Rooms
* **Requires Confirmation:** `false`
* **Description:** Creates a shared doorway gate opening between two adjacent rooms. Automatically snaps standalone rooms flush to eliminate gaps and cuts the doorway opening on both rooms.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomIdA` | `string` | Yes | — | ID of the first room |
  | `roomIdB` | `string` | Yes | — | ID of the second room |
  | `wallDirection` | `enum` | No | Auto-detect | Relative direction: `'above'` \| `'right'` \| `'below'` \| `'left'` |
  | `openingWidth` | `number` | No | `4.0` | Width of doorway opening in feet |
* **Output:** `{ success: true, gateId, roomIdA, roomIdB, wallDirection, position, width, openingWidth }`

---

#### `disconnect_rooms`
* **Title:** Disconnect Rooms
* **Requires Confirmation:** `false`
* **Description:** Removes the doorway gate connection between two rooms, restoring a solid partition wall.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomIdA` | `string` | No | — | ID of the first room (required if gateId omitted) |
  | `roomIdB` | `string` | No | — | ID of the second room (required if gateId omitted) |
  | `gateId` | `string` | No | — | Optional specific gate ID to remove |
* **Output:** `{ success: true, roomIdA, roomIdB, message }`

---

### Category 2: Structure (5 Tools)

#### `add_wall`
* **Title:** Add Wall
* **Requires Confirmation:** `false`
* **Description:** Adds an interior structural wall partition segment inside or across a room.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Associated room ID |
  | `start` | `object` `{ x, z }` | Yes | — | Start point in feet |
  | `end` | `object` `{ x, z }` | Yes | — | End point in feet |
  | `height` | `number` | No | Room height | Wall height in feet |
  | `thickness` | `number` | No | `0.5` | Wall thickness in feet |
* **Output:** `{ success: true, wallId, roomId, start, end, height, thickness }`

---

#### `set_wall_dimensions`
* **Title:** Set Wall Dimensions
* **Requires Confirmation:** `false`
* **Description:** Modifies the length, height, or thickness of an existing custom wall segment.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `wallId` | `string` | Yes | — | Stable ID of the wall segment |
  | `length` | `number` | No | Current | New total length in feet |
  | `height` | `number` | No | Current | New height in feet |
  | `thickness` | `number` | No | Current | New thickness in feet |
* **Output:** `{ success: true, wallId }`

---

#### `place_door`
* **Title:** Place Door
* **Requires Confirmation:** `false`
* **Description:** Places an architectural door opening with standard, double, sliding, pocket, or arch style.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Target room ID |
  | `wallId` | `string` | No | — | Optional wall ID |
  | `position` | `object` `{ x, y, z }` | Yes | — | Doorway center coordinates in feet |
  | `width` | `number` | No | `3.2` | Door width in feet |
  | `height` | `number` | No | `7.0` | Door height in feet |
  | `doorType` | `enum` | No | `'standard'` | Options: `'standard'`, `'double'`, `'sliding'`, `'pocket'`, `'arch'` |
* **Output:** `{ success: true, doorId, roomId, position, width, height, doorType }`

---

#### `place_window`
* **Title:** Place Window
* **Requires Confirmation:** `false`
* **Description:** Places a glass window opening on a room exterior or partition wall with configurable sill elevation.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | Target room ID |
  | `wallId` | `string` | No | — | Optional wall ID |
  | `position` | `object` `{ x, y, z }` | Yes | — | Center coordinates of the window in feet |
  | `width` | `number` | No | `4.5` | Window opening width in feet |
  | `height` | `number` | No | `4.5` | Window opening height in feet |
  | `elevation` | `number` | No | `3.0` | Sill height above floor in feet |
* **Output:** `{ success: true, windowId, roomId, position, width, height, elevation }`

---

#### `change_ceiling_height`
* **Title:** Change Ceiling Height
* **Requires Confirmation:** `false`
* **Description:** Adjusts the ceiling height for a specific room or across the entire residence.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `height` | `number` | Yes | — | New ceiling height in feet (e.g. `9.5`, `10.5`, `12.0`) |
  | `roomId` | `string` | No | All rooms | Optional room ID. If omitted, applies globally. |
* **Output:** `{ success: true, height, roomId }`

---

### Category 3: Objects / Furniture (10 Tools)

#### `add_furniture`
* **Title:** Add Furniture
* **Requires Confirmation:** `false`
* **Description:** Instantiates a furniture piece, appliance, lighting fixture, or decor item into a designated room at specific coordinates. Matches the full human designer catalog (32 items across 10 categories) and applies realistic defaults, collision checks, and room boundary validation.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `type` | `enum` | Yes | — | Catalog identifier. Choose from the **32 architectural items** below or common aliases |
  | `position` | `object` `{ x, y, z }` | Yes | — | Placement coordinates in feet `{ x, y, z }` |
  | `roomId` | `string` | No | Auto-detected | Enclosing room ID |
  | `name` | `string` | No | Catalog name | Custom display label override |
  | `rotation` | `object` `{ x, y, z }` | No | `{0, 0, 0}` | Euler rotation angles in degrees (yaw on Y) |
  | `scale` | `object` `{ x, y, z }` | No | `{1, 1, 1}` | Scale multiplier vector |
  | `material` | `string` | No | Default | PBR material finish ID override |
  | `color` | `string` | No | Default | Hex tint color override (e.g. `#ffffff`, `#3b82f6`) |

##### Complete 32-Item Human Catalog Reference

| Category | Type Identifier (`type`) | Catalog Item Name | Dimensions ($W \times H \times D$ ft) | Default Material & Color | Architectural Description |
|:---|:---|:---|:---:|:---|:---|
| **Seating** | `sofa_4seater` | 4-Seater Luxury Sofa | $8.5 \times 2.8 \times 3.2$ | `fabric_linen_white` (`#ffffff`) | Grand 4-seater white linen sofa with wood plinth base |
| **Seating** | `sofa_3seater_lounger` | 3-Seater Cyan Lounger | $3.0 \times 2.8 \times 6.5$ | `velvet_cyan` (`#38bdf8`) | Modern 3-seater lounger with deep chaise in cyan upholstery |
| **Seating** | `armchair_accent` | Designer Accent Lounge Chair | $2.8 \times 2.8 \times 2.8$ | `fabric_cream` (`#f8fafc`) | Sculptural curved lounge chair with brass tapered legs |
| **Seating** | `sofa_sectional` | L-Shape Sectional Sofa | $9.0 \times 2.8 \times 6.5$ | `fabric_linen_grey` (`#4b5563`) | Generous 4-seater modular fabric sectional with chaise |
| **Tables** | `dining_table_6s` | 6 Person Dinning Table | $7.0 \times 2.6 \times 3.5$ | `wood_walnut` (`#451a03`) | Solid walnut dining table with 6 matching modern chairs |
| **Tables** | `coffee_table_center` | Glass & Brass Center Table | $4.5 \times 1.5 \times 3.0$ | `glass_metal` (`#38bdf8`) | Architectural tempered glass coffee table with brass frame |
| **Tables** | `table_drinks_round` | Round Drinks Table | $2.0 \times 1.8 \times 2.0$ | `glass_brass` (`#38bdf8`) | Pedestal drinks side table with marble top and brass stem |
| **Tables** | `nightstand_modern` | Modern Bedside Nightstand | $1.8 \times 1.8 \times 1.6$ | `wood_oak` (`#5c3a21`) | Oak bedside nightstand with brass handle and table lamp |
| **Bedroom** | `bed_double` | Double Bed (6'-0" x 6'-6") | $6.0 \times 3.8 \times 6.5$ | `fabric_linen_grey` (`#e2e8f0`) | King double bed with tufted headboard, duvet, and pillows |
| **Bedroom** | `bed_guest_double` | Guest Double Bed (6'-0" x 6'-9") | $6.75 \times 3.8 \times 6.0$ | `fabric_linen_grey` (`#e2e8f0`) | Extended guest suite double bed with upholstered headboard |
| **Storage & TV**| `wardrobe_sliding` | Sliding Door Wardrobe | $6.25 \times 8.5 \times 2.0$ | `wood_charcoal` (`#334155`) | Full-height built-in wardrobe with smooth sliding panels |
| **Storage & TV**| `consol_low_ht` | Low Ht Consol & Mirror | $3.0 \times 2.4 \times 1.67$ | `marble_carrara` (`#f8fafc`) | Dressing console table with full-length wall mirror |
| **Storage & TV**| `storage_low_ht` | Low Ht Storage Credenza | $3.5 \times 2.2 \times 1.75$ | `wood_oak` (`#e2e8f0`) | Low-profile storage unit with dual sliding compartments |
| **Storage & TV**| `shoe_unit_foyer` | Main Entry Shoe Unit | $3.2 \times 3.5 \times 1.4$ | `wood_oak` (`#334155`) | Foyer entryway shoe storage cabinet with marble top ledge |
| **Storage & TV**| `tv_unit_grand` | Grand T.V Unit & 85" Screen | $11.0 \times 4.5 \times 1.8$ | `wood_marble` (`#ffffff`) | Fluted marble media wall backing with 85-inch 4K screen |
| **Storage & TV**| `tv_console_bedroom`| Bedroom T.V Console | $4.5 \times 3.0 \times 1.2$ | `wood_oak` (`#1e293b`) | Wall-mounted bedroom media console with 55-inch TV |
| **Storage & TV**| `store_pantry_rack` | Store Pantry Shelving Unit | $5.0 \times 7.5 \times 1.8$ | `metal_steel` (`#475569`) | Multi-tier steel heavy-duty pantry storage shelving rack |
| **Office** | `study_table_desk` | Study Table (72" x 21") | $6.0 \times 2.5 \times 1.75$ | `wood_oak` (`#ffffff`) | Executive study desk with monitor setup and chair |
| **Kitchen** | `dumb_waiter_counter`| Dumb Waiter Service Ledge | $6.0 \times 3.0 \times 1.4$ | `wood_walnut` (`#334155`) | Dining buffet service counter with dumb waiter compartment |
| **Kitchen** | `kitchen_counter_hob`| 27" Deep Platform & 4-Burner Hob | $9.0 \times 3.0 \times 2.25$ | `granite_black` (`#0f172a`) | Quartz modular counter with 4-burner black glass gas hob |
| **Kitchen** | `kitchen_counter_sink`| Cooking Sink & Water Ledge | $7.5 \times 3.0 \times 2.25$ | `quartz_white` (`#ffffff`) | Quartz counter with double stainless sink & gooseneck faucet |
| **Kitchen** | `refrigerator_french_door`| French Door Refrigerator | $3.0 \times 6.2 \times 2.8$ | `metal_stainless` (`#64748b`)| Multi-door French refrigerator with ice dispenser |
| **Kitchen** | `utility_counter_sink`| 27" Deep Platform & Sink (Utility) | $3.8 \times 3.0 \times 2.25$| `granite_grey` (`#334155`) | Heavy duty stone platform counter with deep laundry sink |
| **Kitchen/Utility**| `utility_washing_machine`| Front-Load Washing Machine (W/M)| $2.4 \times 3.0 \times 2.4$ | `metal_white` (`#f8fafc`) | Energy-efficient front-load washing machine with glass door |
| **Spiritual** | `pooja_mandir_sanctuary`| Sacred Pooja Mandir Altar | $2.2 \times 5.5 \times 2.6$ | `marble_teak` (`#d97706`) | Ornate marble & teakwood temple altar with brass diya lamps |
| **Bathroom** | `bathroom_wc_commode`| Wall-Hung WC Commode | $1.6 \times 2.4 \times 2.2$ | `ceramic_white` (`#ffffff`)| Wall-hung ceramic toilet commode with chrome flush plate |
| **Bathroom** | `bathroom_vanity_basin`| Bathroom Vanity Basin & Mirror | $3.2 \times 2.8 \times 1.8$ | `marble_carrara` (`#f1f5f9`)| Floating vanity counter with ceramic sink and LED mirror |
| **Bathroom** | `bathroom_shower_cubicle`| Glass Shower Cubicle Enclosure | $3.2 \times 7.5 \times 3.2$ | `glass_chrome` (`#cbd5e1`) | Frameless glass shower enclosure with rainfall column |
| **Decor** | `planter_garden_strip`| Lush Planter Garden Strip | $18.0 \times 3.5 \times 2.2$| `terracotta_plants` (`#16a34a`)| Continuous living green landscape trough with uplighting |
| **Outdoor** | `planter_balcony_pots`| Balcony Planter Pots Trio | $7.5 \times 2.5 \times 1.2$ | `terracotta_plants` (`#15803d`)| Row of terracotta balcony planters with ornamental plants |
| **Lighting** | `chandelier_modern` | Modern Linear Chandelier | $5.0 \times 2.2 \times 2.0$ | `glass_brass` (`#d4af37`) | Suspended brass linear fixture with frosted glass globe pendants |
| **Lighting** | `lamp_floor` | Standing Floor Lamp | $1.5 \times 5.2 \times 1.5$ | `metal_brass` (`#e2e8f0`) | Architectural brass floor lamp with cylindrical diffuser |

*Also supports standard aliases:* `bed_king`, `bed_queen`, `armchair_lounge`, `table_dining`, `table_coffee`, `kitchen_counter`, `bathroom_vanity`, `outdoor_table`.

* **Output:** `{ success: true, objectId, name, type, category, roomId, position, rotation, dimensions, insideRoomBounds, warning }`

---

#### `move_object`
* **Title:** Move Object
* **Requires Confirmation:** `false`
* **Description:** Moves an existing furniture piece or accessory to a new `{x, y, z}` position in feet.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `objectId` | `string` | Yes | — | Stable ID of the object (e.g. `obj-sofa-01`) |
  | `position` | `object` `{ x, y, z }` | Yes | — | Target coordinates in feet |
* **Output:** `{ success: true, objectId, position }`

---

#### `rotate_object`
* **Title:** Rotate Object
* **Requires Confirmation:** `false`
* **Description:** Rotates an object in degrees around the `{x, y, z}` axes (primarily Y-axis yaw in architectural floor plans).
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `objectId` | `string` | Yes | — | Stable ID of the object |
  | `rotation` | `object` `{ x, y, z }` | Yes | — | Rotation angles in degrees `{ x, y, z }` |
* **Output:** `{ success: true, objectId, rotation }`

---

#### `scale_object`
* **Title:** Scale Object
* **Requires Confirmation:** `false`
* **Description:** Scales an object along its width (x), height (y), and depth (z) dimensions.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `objectId` | `string` | Yes | — | Stable ID of the object |
  | `scale` | `object` `{ x, y, z }` | Yes | — | Scale multipliers vector `{ x, y, z }` |
* **Output:** `{ success: true, objectId, scale }`

---

#### `delete_object`
* **Title:** Delete Object
* **Requires Confirmation:** `false`
* **Description:** Removes a furniture or decor piece from the 3D scene.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `objectId` | `string` | Yes | — | Stable ID of the object to remove |
* **Output:** `{ success: true, deletedObjectId, name }`

---

#### `set_transform_lock`
* **Title:** Set Transform Lock
* **Requires Confirmation:** `false`
* **Description:** Locks or unlocks a furniture piece or room to prevent accidental movement or edits.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `targetId` | `string` | Yes | — | ID of the room or furniture item |
  | `locked` | `boolean` | Yes | — | `true` to lock transforms, `false` to unlock |
* **Output:** `{ success: true, targetId, locked }`

---

#### `set_furniture_dimensions`
* **Title:** Set Furniture Dimensions
* **Requires Confirmation:** `false`
* **Description:** Sets the exact physical dimensions (width, height, depth in feet) of a furniture object, updating geometry scales automatically.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `objectId` | `string` | Yes | — | ID of the furniture object |
  | `width` | `number` | No | Current | Target width in feet |
  | `height` | `number` | No | Current | Target height in feet |
  | `depth` | `number` | No | Current | Target depth in feet |
* **Output:** `{ success: true, objectId, dimensions: { x, y, z }, scale }`

---

#### `fit_furniture_to_wall`
* **Title:** Fit Furniture to Wall
* **Requires Confirmation:** `false`
* **Description:** Resizes furniture (such as oversized wardrobes, beds, or credenzas) to fit adjacent to the floor plan layout wall with clean clearance.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `objectId` | `string` | Yes | — | ID of the furniture object to fit |
  | `wallDirection` | `enum` | No | `'nearest'` | Options: `'nearest'`, `'top'`, `'bottom'`, `'left'`, `'right'` |
  | `maxWidth` | `number` | No | Uncapped | Max allowed width constraint in feet |
  | `maxDepth` | `number` | No | Uncapped | Max allowed depth constraint in feet |
  | `margin` | `number` | No | `0.25` | Clearance margin from wall in feet |
  | `snapToWall` | `boolean` | No | `true` | Snap flush against the wall |
* **Output:** `{ success: true, objectId, name, roomName, wallDirection, newDimensions, newPosition }`

---

#### `auto_fit_room_furniture`
* **Title:** Auto-Fit Room Furniture
* **Requires Confirmation:** `false`
* **Description:** Automatically detects and resizes any oversized furniture in a room (e.g. wardrobes that exceed safe room clearance) to fit adjacent room walls.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `roomId` | `string` | Yes | — | ID of the room |
  | `category` | `enum` | No | `'all'` | Category to fit: `'storage'`, `'bedroom'`, `'seating'`, `'tables'`, `'all'` |
* **Output:** `{ success: true, roomId, fittedCount, items }`

---

#### `get_furniture_catalog`
* **Title:** Get Furniture Catalog
* **Requires Confirmation:** `false`
* **Description:** Returns the complete 32-item architectural catalog of furniture, fixtures, appliances, lighting, and decor items matching the human designer's catalog. Supports category filtering and keyword search so agents can dynamically inspect item types, default dimensions ($W \times H \times D$ in feet), default PBR materials, and descriptions before placing objects.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `category` | `enum` | No | `'all'` | Filter items by category: `'all'`, `'seating'`, `'bedroom'`, `'tables'`, `'kitchen'`, `'storage'`, `'office'`, `'bathroom'`, `'lighting'`, `'outdoor'`, `'decor'`, `'spiritual'` |
  | `searchQuery` | `string` | No | — | Filter items by name, description, or tags (e.g. `'wardrobe'`, `'refrigerator'`, `'mandir'`) |
* **Output:**
  ```json
  {
    "success": true,
    "totalCount": 32,
    "items": [
      {
        "type": "sofa_4seater",
        "name": "4-Seater Luxury Sofa",
        "category": "seating",
        "description": "Grand 4-seater white linen sofa with plush cushions and wood plinth base",
        "defaultDimensions": { "x": 8.5, "y": 2.8, "z": 3.2 },
        "defaultMaterial": "fabric_linen_white",
        "defaultColor": "#ffffff",
        "tags": ["living", "sofa", "seating", "luxury", "4-seater"]
      }
    ]
  }
  ```

---

### Category 4: Materials & Finishes (2 Tools)

#### `apply_material`
* **Title:** Apply Material
* **Requires Confirmation:** `false`
* **Description:** Applies an architectural finish or color swatch to a room floor, room wall, or furniture object.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `targetId` | `string` | Yes | — | Room ID or Furniture Object ID |
  | `targetType` | `enum` | Yes | — | `'room_floor'` \| `'room_wall'` \| `'object'` |
  | `materialId` | `string` | Yes | — | Material identifier (e.g. `hardwood_walnut`, `marble_carrara`, `terrazzo`, `concrete_polished`) |
  | `color` | `string` | No | — | Optional hex color tint override |
* **Output:** `{ success: true, targetId, materialId, color }`

---

#### `change_texture`
* **Title:** Change Texture
* **Requires Confirmation:** `false`
* **Description:** Changes the surface texture mapping and PBR properties (scale, roughness, metalness) of a surface.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `targetId` | `string` | Yes | — | Room ID or Furniture Object ID |
  | `textureType` | `string` | Yes | — | Texture mapping identifier |
  | `scale` | `number` | No | `1.0` | UV tile repeat scale |
  | `roughness` | `number` | No | `0.5` | Surface roughness (0.0 to 1.0) |
  | `metalness` | `number` | No | `0.0` | Surface metalness (0.0 to 1.0) |
* **Output:** `{ success: true, targetId, textureType }`

---

### Category 5: Scene / View (6 Tools)

#### `generate_floor_plan`
* **Title:** Generate Floor Plan
* **Requires Confirmation:** `false`
* **Description:** Switches to the 2D CAD architectural schematic layout view and generates floor plan annotations.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `style` | `enum` | No | `'architectural'` | Options: `'architectural'`, `'schematic'`, `'blueprint'`, `'minimal'` |
  | `includeDimensions` | `boolean` | No | `true` | Whether to display dimensional annotations |
* **Output:** `{ success: true, style, roomCount, totalAreaSqFt, viewMode: '2d' }`

---

#### `switch_view`
* **Title:** Switch View
* **Requires Confirmation:** `false`
* **Description:** Switches viewport camera mode between 3D orbit, 2D floorplan/elevations (`top`, `north`, `east`, `south`, `west`, `inside`), and 1st-person Walk mode.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `view` / `mode` | `enum` | No | `'3d'` | Camera mode: `'3d'` \| `'2d'` \| `'walk'` |
  | `angle` | `enum` | No | `'perspective'` | View angle: `'perspective'`, `'top'`, `'north'`, `'east'`, `'south'`, `'west'`, `'inside'` |
  | `targetRoomId` | `string` | No | — | Focus camera on a specific room ID |
* **Output:** `{ success: true, mode, angle, targetRoomId }`

---

#### `take_screenshot`
* **Title:** Take Screenshot
* **Requires Confirmation:** `false`
* **Description:** Captures a high-resolution snapshot rendering of the active canvas viewport.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `format` | `enum` | No | `'png'` | Image file format: `'png'` \| `'jpeg'` |
  | `resolution` | `enum` | No | `'standard'` | Output preset: `'standard'` \| `'hd'` \| `'4k'` |
  | `viewMode` | `enum` | No | Current | View mode override: `'3d'` \| `'2d'` \| `'walk'` |
* **Output:** `{ success: true, format, resolution, dataLength, capturedAt }`

---

#### `get_scene_state`
* **Title:** Get Scene State
* **Requires Confirmation:** `false`
* **Description:** Returns the full source of truth: rooms, furniture items, connection gates, doors, windows, walls, and dimensions in feet. Ideal for agent grounding before performing complex edits.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `includeFurniture` | `boolean` | No | `true` | Include furniture items |
  | `includeMeasurements` | `boolean` | No | `true` | Include spatial measurements |
  | `roomId` | `string` | No | All | Optional room ID filter |
* **Output:** Full Scene JSON `{ rooms, furniture, walls, doors, windows, gates, dimensions: { roomCount, furnitureCount, totalAreaSqFt } }`

---

#### `select_item`
* **Title:** Select Item
* **Requires Confirmation:** `false`
* **Description:** Selects a room, furniture piece, door, window, or wall in the 3D studio viewport and opens the inspector.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `id` | `string` | Yes | — | ID of element to select (or `null` to clear) |
  | `type` | `enum` | No | — | Type: `'room'`, `'furniture'`, `'wall'`, `'door'`, `'window'`, `'gate'` |
* **Output:** `{ success: true, selectedId, selectedType }`

---

#### `set_grid_snap`
* **Title:** Set Grid Snap
* **Requires Confirmation:** `false`
* **Description:** Toggles viewport grid snapping and configures snap grid increment in feet.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `enabled` | `boolean` | Yes | — | Enable or disable grid snapping |
  | `size` | `number` | No | `0.5` | Grid snap interval in feet (e.g. `0.5`, `1.0`) |
* **Output:** `{ success: true, enabled, size }`

---

### Category 6: Workflow & Project Management (11 Tools)

#### `undo`
* **Title:** Undo Action
* **Requires Confirmation:** `false`
* **Description:** Reverts the most recent design action on the scene graph.
* **Input Schema:** `{}`
* **Output:** `{ success: true, message: 'Undid last change' }`

---

#### `redo`
* **Title:** Redo Action
* **Requires Confirmation:** `false`
* **Description:** Re-applies the most recently reverted design action.
* **Input Schema:** `{}`
* **Output:** `{ success: true, message: 'Redid change' }`

---

#### `export_model`
* **Title:** Export 3D Model
* **Requires Confirmation:** ⚠️ **`true`**
* **Description:** Generates and downloads a 3D CAD/BIM model file in GLB, OBJ, IFC4, or JSON format.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `format` | `enum` | Yes | — | Model export format: `'glb'` \| `'obj'` \| `'ifc4'` \| `'json'` |
  | `includeMetadata` | `boolean` | No | `true` | Include BIM / room metadata |
* **Output:** `{ success: true, format, filename, byteSize, timestamp }`

---

#### `set_confirmation_policy`
* **Title:** Set Confirmation Policy
* **Requires Confirmation:** `false`
* **Description:** Configures the human-in-the-loop trust boundary and confirmation requirements for agent actions.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `requireConfirmation` | `boolean` | Yes | — | Whether irreversible actions require human approval |
  | `allowedActions` | `array<string>` | No | `[]` | Whitelist of auto-approved tool names |
* **Output:** `{ success: true, requireConfirmation }`

---

#### `create_project`
* **Title:** Create Project
* **Requires Confirmation:** `false`
* **Description:** Creates a new project workspace. Supports importing a 2D CAD blueprint image and user prompt instructions to automatically synthesize a 3D architectural plan.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `name` | `string` | Yes | — | Name of the project workspace |
  | `description` | `string` | No | — | Optional project description or notes |
  | `template` | `enum` | No | `'blank'` | Starter workspace template |
  | `cadDataUrl` | `string` | No | — | Optional base64/data URL of 2D CAD blueprint image |
  | `cadFileName` | `string` | No | — | Display name of the CAD drawing |
  | `userPrompt` | `string` | No | — | Design instructions (e.g. `2BHK with open kitchen`) |
  | `stylePreset` | `enum` | No | `'modern_luxury'` | Theme: `'modern_luxury'`, `'minimalist'`, `'warm_contemporary'`, `'scandinavian'`, `'industrial'` |
  | `autoBuild3D` | `boolean` | No | `true` | Automatically synthesize 3D layout from image/prompt |
* **Output:** `{ success: true, projectId, name, roomCount, totalAreaSqFt, template, synthesis }`

---

#### `open_project`
* **Title:** Open Project
* **Requires Confirmation:** `false`
* **Description:** Loads and opens an existing project workspace by ID.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `projectId` | `string` | Yes | — | ID of the project to open |
* **Output:** `{ success: true, projectId, name, roomCount, totalAreaSqFt }`

---

#### `list_projects`
* **Title:** List Projects
* **Requires Confirmation:** `false`
* **Description:** Lists all saved project workspaces with room count, area, and metadata.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `searchQuery` | `string` | No | — | Optional search keyword to filter projects |
  | `sortBy` | `enum` | No | `'updated'` | Sort criteria: `'updated'` \| `'name'` \| `'created'` |
* **Output:** `{ success: true, totalCount, projects }`

---

#### `delete_project`
* **Title:** Delete Project
* **Requires Confirmation:** ⚠️ **`true`**
* **Description:** Permanently deletes a project workspace by ID or deletes the currently active project.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `projectId` | `string` | No | Active project | ID of the project to delete |
* **Output:** `{ success: true, deletedProjectId, message }`

---

#### `duplicate_project`
* **Title:** Duplicate Project
* **Requires Confirmation:** `false`
* **Description:** Creates a cloned duplicate copy of an existing project workspace.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `projectId` | `string` | No | Active project | ID of project to clone |
* **Output:** `{ success: true, projectId, name, roomCount, totalAreaSqFt }`

---

#### `load_sample_project`
* **Title:** Load Sample Project
* **Requires Confirmation:** `false`
* **Description:** Loads pre-built architectural blueprints: `"3BHK_Sample"` (Sample_2.png) or `"4BHK_Sample"` (Sample_1.png).
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `sampleName` | `enum` | Yes | — | Preset name: `'3BHK_Sample'` \| `'4BHK_Sample'` |
* **Output:** `{ success: true, projectId, name, roomCount, totalAreaSqFt }`

---

#### `clear_scene`
* **Title:** Clear Scene
* **Requires Confirmation:** ⚠️ **`true`**
* **Description:** Clears all rooms, furniture, and walls from the active workspace.
* **Input Schema:** `{}`
* **Output:** `{ success: true, message: 'Cleared all rooms and furniture from workspace' }`

---

### Category 7: CAD to 3D Synthesis (1 Tool)

#### `build_3d_from_cad`
* **Title:** Build 3D Plan from CAD
* **Requires Confirmation:** `false`
* **Description:** Synthesizes a 2D CAD architectural blueprint image into a fully structured 3D interior plan with deterministic walls, doors, gates, and furniture matching the image and user instructions.
* **Input Schema:**
  | Property | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `cadDataUrl` | `string` | No | Active project CAD | Base64/data URL of the 2D CAD blueprint or floorplan image |
  | `blueprintName` | `string` | No | `'2D Architectural Plan'` | Display name of the blueprint drawing |
  | `userPrompt` | `string` | No | — | Design requirements / instructions from user (e.g. `2BHK with open kitchen`) |
  | `projectName` | `string` | No | Active project name | Target project name |
  | `description` | `string` | No | — | Project description or client design notes |
  | `stylePreset` | `enum` | No | `'modern_luxury'` | Theme: `'modern_luxury'`, `'minimalist'`, `'warm_contemporary'`, `'scandinavian'`, `'industrial'` |
  | `furnished` | `boolean` | No | `true` | Whether to furnish the generated rooms |
* **Output:**
  ```json
  {
    "success": true,
    "roomsCreated": 8,
    "gatesCreated": 6,
    "furniturePlaced": 24,
    "totalAreaSqFt": 1420,
    "viewMode": "3d",
    "validationConfidence": 0.96,
    "validationErrors": [],
    "validationWarnings": [],
    "message": "Successfully synthesized 'Blueprint Drawing' into an 8-room deterministic 3D architectural plan with 96% geometric validation score."
  }
  ```

---

## 5. Typical Multi-Turn Agent Workflows

### Example 1: Creating a Master Bedroom with Attached Walk-in Closet and Ensuite
```javascript
// Step 1: Create Master Bedroom
const master = await tools.create_room.execute({
  name: "Master Bedroom",
  width: 16,
  depth: 14,
  floorMaterial: "hardwood_walnut",
  position: { x: 0, y: 0, z: 0 }
});

// Step 2: Attach Walk-in Closet to the right with 4ft opening
const closet = await tools.add_connected_room.execute({
  referenceRoomId: master.roomId,
  direction: "right",
  name: "Walk-in Closet",
  width: 8,
  depth: 14,
  floorMaterial: "hardwood_walnut",
  openingWidth: 4.0
});

// Step 3: Attach Master Bathroom below the closet
const bath = await tools.add_connected_room.execute({
  referenceRoomId: closet.roomId,
  direction: "below",
  name: "Master Bath",
  width: 8,
  depth: 8,
  floorMaterial: "marble_carrara",
  openingWidth: 3.0
});

// Step 4: Furnish Master Bedroom with King Bed and Nightstands
await tools.add_furniture.execute({
  type: "bed_king",
  roomId: master.roomId,
  position: { x: 0, y: 0, z: -3 }
});
```

### Example 2: Designing an L-Shaped Living/Dining Suite
```javascript
// Step 1: Create L-shaped Great Room with top-right notch cutout
const greatRoom = await tools.create_room.execute({
  name: "Great Room",
  width: 24,
  depth: 20,
  floorMaterial: "herringbone_wood",
  notch: {
    corner: "top-right",
    width: 10,
    depth: 10
  }
});

// Step 2: Fit an open Breakfast Kitchen into the notch cutout
const kitchen = await tools.fit_room_into_notch.execute({
  parentRoomId: greatRoom.roomId,
  name: "Kitchen",
  floorMaterial: "ceramic_tile",
  openingWidth: 6.0
});
```
