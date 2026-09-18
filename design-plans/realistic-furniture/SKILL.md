---
name: realistic-furniture
description: Build or improve realistic interactive 3D furniture, fixtures, and plants, including construction geometry, PBR materials, lighting, and performance. Use for furniture realism in a 3D editor or architectural scene.
---

# Realistic furniture

Deliver editable 3D objects whose silhouette, construction, surfaces, and lighting remain convincing at room scale and close range. Treat photorealism as a visual acceptance criterion, not a synonym for adding polygons or raising metalness.

## Inspect and implement

Inspect the catalog, mesh factory, material system, renderer, selection/export paths, and resource disposal. Account for every requested type, including aliases and fallback branches. Preserve IDs, placement, rotation, units, dimensions, and editing behavior.

Prioritize recognizable construction before microdetail:

- Upholstery: rounded cushions with separation, piping, softened corners, supported backs and legs. Bedding needs a mattress, pillows with loft, a turned-down duvet and irregular folds.
- Joinery: bevels, grain following the component, drawer reveals, handles, recessed plinths, and credible panel thickness. Dining chairs need supports and outward-facing backs on both sides.
- Fixtures: sinks need an opening and interior, taps need a spout, ceramic differs from fabric, and appliances need doors, controls and seals. A mirror needs reflected imagery or an honestly limited reflective approximation.
- Plants: varied leaves on stems with deterministic rotations and proportions; instance foliage to control draw calls.

Use material-specific physically based rendering. Wood and fabric are nonmetallic; metals need a reflection environment. Fabric needs subtle weave and high roughness; polished stone needs restrained veins; glass needs thickness and a sensible transmission budget. Color maps use sRGB; data maps use no color-space transform. Match texture scale to the object instead of using identical oversized grain across tiny and large parts.

Use licensed, optimized models/textures when they materially improve fidelity. Preserve source/license details for imported assets. Procedural geometry and maps support offline operation and broad coverage, but do not claim they are scanned assets or photo-quality without visual evidence.

## Lighting and lifecycle

Balance daylight, fill, reflected light, exposure, and contact shadows so white fabric retains detail and black objects retain shape. Check the actual WebGPU and WebGL paths when present; shader-only customizations can silently fail on the other renderer.

Share immutable textures and instance repeated details. Give geometry, materials, and shared resources explicit owners; replacing a group releases owned resources without disposing maps still used by other groups. Assess a furnished apartment as well as an isolated asset.

## Verify

Build/type-check and instantiate the affected catalog. Check finite geometry, bounded triangle counts, scaling, selection, and repeat rebuilds. Inspect close-up seating/bedding, a reflective fixture, plants, and the full room in the live renderer. Compare equivalent viewpoints and report actual visual and performance limitations. A passing build alone does not establish realism.

For HouseSpace, inspect `src/canvas/furnitureMeshes.ts`, `src/canvas/furnitureRealism.ts`, `src/canvas/StudioCanvas.tsx`, and `src/data/catalogData.ts`. Scene dimensions are feet; local geometry converts to metres once using `FT_TO_M`. The group transform belongs to the caller. Preserve this contract when replacing models.
