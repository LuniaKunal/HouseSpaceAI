# Walls & Openings

Open the **Walls & Openings** tab (door icon) in the studio sidebar. Select a wall from the list or click a wall in the 3D view.

## Human editing

- Choose **Open connection** to remove a full-height span without merging the named rooms. Enter a start offset and width, or choose **Use full wall length**.
- Choose **Hinged doorway** to add a wall-aligned door. Set width, height, hinge and swing. The slider previews its position before saving.
- Use **Edit** to adjust an existing opening. **Remove opening** restores the wall span; it does not delete furniture.
- Use **Check layout** and expand the issue list to locate conflicts. Adding openings never silently rearranges furniture.
- Every successful edit supports Undo/Redo and project saving. Invalid edits leave the scene and history unchanged.

Measurements are feet from the listed wall's start point. Shared spans are cut on both sides. A partial opening preserves the wall sections at either end. Doorways preserve overhead masonry in full-height mode; open connections have no overhead masonry.

## WebMCP

Human controls and these tools use the same scene-store operations:

| Tool | Purpose |
| --- | --- |
| `list_space_boundaries` | Read wall IDs, endpoints, lengths, room IDs and openings |
| `set_space_boundary` | Add/resize an open connection, or restore one specified opening to wall |
| `place_door` | Place a wall-aligned door using `wallId` and `offset` |
| `update_door` | Change offset, dimensions, hinge or swing |
| `remove_opening` | Remove one door/open connection |
| `validate_layout` | Read-only wall, furniture, opening and door-clearance checks |

For example, after obtaining an actual wall ID:

```json
{ "wallId": "<listed wall ID>", "kind": "open", "offset": 2, "width": 6 }
```

Do not infer that rooms should be opened merely from their names. Existing samples are not converted automatically. The 4BHK sample is unchanged by this feature.

## Implementation and limits

The geometry module resolves wall pieces once per structural change and reuses them for rendering and collision checks. Boundary topology and resolved pieces are reference-cached; moving furniture does not invalidate them. New wall/door materials are shared within a rendered group and disposed with its geometry.

Newly edited layouts use actual wall pieces rather than treating every zone edge as an obstacle. Furniture can straddle an open edge while remaining inside the combined floor area. Door checks conservatively reserve the swing rectangle plus a 2.5-foot approach on either side. These checks are not accessibility or building-code certification, nor a whole-home route planner.

The first-release human editor focuses on hinged doors and numeric/slider placement. Other existing door styles remain available through `place_door`; an arch is currently a rectangular frameless passage, not curved masonry. Free-rotating a wall-aligned door is rejected; change hinge/swing instead. Large room-topology changes should be followed by **Check layout** and inspection of affected openings.

Verification: `npm run test:all` includes `tests/test_architecture.ts`; `npm run build` checks TypeScript and the production bundle.
