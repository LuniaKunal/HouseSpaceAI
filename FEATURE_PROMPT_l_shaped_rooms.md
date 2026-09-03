# Feature Prompt: Non-Rectangular (L-Shaped) Rooms

## Problem

Rooms are currently modeled as an axis-aligned rectangle: position + width +
depth. Real floorplans include L-shaped rooms (e.g. Bedroom-1 combined with
an adjoining wash/closet nook — see attached floorplan vs. current 3D output).
When a room's real footprint isn't rectangular, the app currently falls back
to the bounding rectangle and leaves the non-existent portion as dead space
inside the room instead of cut away.

This is not a rendering bug — it's a missing capability in the data model.
A rectangle literally cannot represent a notch. Fixing it means changing how
a room's shape is stored, not just how it's drawn.

## Proposed data model change

Move room shape from `{ width, depth }` to a **polygon**: an ordered list of
`{x, z}` vertices defining the floor outline, still stored in feet, still
relative to the room's origin. A plain rectangle becomes the 4-vertex special
case — so this is additive, not a breaking rewrite of the simple case.

```ts
// Before
type Room = {
  id: string
  name: string
  position: { x: number, z: number }
  width: number
  depth: number
  ceilingHeight: number
  // ...
}

// After
type Room = {
  id: string
  name: string
  position: { x: number, z: number }
  // width/depth kept for backward compat + as a convenience for the common
  // rectangular case — derived from footprint's bounding box, not authoritative
  width: number
  depth: number
  footprint: { x: number, z: number }[]  // polygon vertices, in order, room-local coords
  ceilingHeight: number
  // ...
}
```

For a plain rectangle, `footprint` is just the 4 corners in order. For an
L-shape, it's 6 vertices tracing the outline including the notch corner.

## What has to change downstream

Be explicit with whoever implements this that all of these need touching —
this isn't just "add a footprint field":

- **Wall generation**: walls must be extruded along each edge of the
  polygon, not just the 4 sides of a box. A concave vertex (the inside
  corner of the L) needs correct wall-join geometry, not a straight
  extrusion — this is the part most likely to reproduce the overlap bug
  you already have, so it's worth explicit test coverage.
- **`connect_rooms` / shared-wall gates**: the gate logic needs to find
  which *edge* of the polygon is shared with the neighboring room, not
  assume "the room has exactly 4 named sides (N/S/E/W)". A room with an L
  has 6 edges, and "Right" as a direction becomes ambiguous — you likely
  need to select the target edge explicitly (e.g. by clicking it) rather
  than the current Above/Right/Below/Left buttons, at least for
  non-rectangular rooms.
- **Furniture bounds checking**: "is this object inside the room" needs
  point-in-polygon, not point-in-rectangle. Cheap to get wrong — a chair in
  the notch's "missing" area would currently pass a bounding-box check but
  shouldn't.
- **`set_room_dimensions`**: needs a variant (or a new tool) that edits
  footprint vertices, since width/depth alone can't describe an L-shape edit.
- **`get_scene_state`**: must return `footprint` for every room, not just
  width/depth, so an agent (or your validator script) can actually reason
  about non-rectangular rooms instead of getting a misleading bounding box.
- **Floor plan import** (if `generate_floor_plan` or any floorplan-reading
  path exists): needs to detect L-shapes from the source plan rather than
  reducing every room to its bounding rectangle at ingestion time — this is
  likely the actual point where the wash-room's shape gets lost today.

## Scope decision to make explicitly

Two ways to ship this — pick one and say so in the implementation, don't let
it drift:

- **A. Full arbitrary polygon support.** Most general, handles any shape,
  more implementation work (concave wall joins, general point-in-polygon).
- **B. L-shape as a named preset** — a rectangle with one rectangular notch
  removed, parameterized as `{ width, depth, notch: { x, z, width, depth } }`
  instead of a free-form vertex list. Much simpler to implement and to
  expose as a WebMCP tool parameter (an agent can reason about "cut a
  4x4 notch from the top-right corner" more reliably than emitting a
  correct 6-vertex polygon from scratch). Doesn't generalize to U-shapes
  or anything more complex, but that may not be needed.

**Recommendation: build B first.** It solves the actual case in your
floorplan, is far less likely to reintroduce wall-geometry bugs, and is a
strict subset of A if you need full polygons later — a notch-rectangle is
just a 6-vertex polygon under the hood, so upgrading path A → B isn't wasted
work.

## WebMCP tool schema impact (Option B)

```ts
create_room({
  name: string
  width: number
  depth: number
  position: { x: number, z: number }
  notch?: {
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    width: number
    depth: number
  }
})
```

Existing agent calls with no `notch` field continue to work unchanged —
this is the backward-compatibility check to run before calling it done.

## Acceptance criteria

1. Creating a room with a notch renders correctly in 3D — the notch area is
   genuinely absent (no floor, no ceiling, walls correctly close the gap),
   not just visually blank space inside a full rectangle.
2. `get_scene_state` reports the room's actual footprint, and a furniture
   item placed inside the notch area is rejected or flagged, not silently
   accepted.
3. An L-shaped room can still be a valid target for `connect_rooms` — test
   connecting a rectangular neighbor to each of the L-room's edges
   individually, including the two edges adjacent to the notch corner.
4. Existing rectangular rooms (no `notch`) are pixel-for-pixel unchanged —
   run this against your existing starter apartment scene to confirm nothing
   regresses.
5. Re-run `validate_layout.js`-style overlap checks against an L-shaped room
   + its neighbors — the point-in-polygon furniture check and the wall-join
   at the concave corner are the two places most likely to reproduce the
   original overlap bug in a new shape.
