# Comprehensive Design System & UI/UX Elevation for HomeSpace.ai

Written against: HEAD (commit current)

## Evidence chain

- Surface: `App.tsx` (Studio Viewport & Projects Dashboard)
- Problem: Visual discordance from 12+ competing raw hex backgrounds, non-tabular numerical metric alignment, fragmented 2D/3D camera mode controls, and flat non-responsive sidebars that dilute the product's architectural CAD identity.
- Design evidence: `tailwind.config.js` (`colors.studio`), `src/index.css` (`font-feature-settings: "cv02", "cv03", "cv04", "cv11"`), `index.html` (Inter & JetBrains Mono)
- Owner: `tailwind.config.js`, `src/index.css`, `src/components/**`, `src/canvas/**`
- Scope and affected surfaces: `ProjectsDashboard.tsx`, `ProjectCard.tsx`, `NewProjectModal.tsx`, `Header.tsx`, `LeftSidebar.tsx`, `SpacesPanel.tsx`, `CatalogPanel.tsx`, `MaterialsPanel.tsx`, `AgentCopilotPanel.tsx`, `InspectorPanel.tsx`, `StudioCanvas.tsx`, `CADBlueprintOverlay.tsx`, `AgentActionFeed.tsx`, `ConfirmationDialog.tsx`, `AgentBridgeModal.tsx`
- Uncertainty: None. Verified via TypeScript build and test suite.

## Design decision

Re-anchor the entire application onto a cohesive, high-precision dark theme design system (`studio.*` semantic elevation scale) with frosted glassmorphism, crisp semi-transparent borders (`border-white/[0.08]`), `tabular-nums` data metrics, unified segmented camera controls, and rich micro-interactions.

## Reuse

- Tokens: `colors.studio` in `tailwind.config.js`
- Fonts: `font-sans` (Inter) and `font-mono` (JetBrains Mono)
- Exemplar: `src/components/header/Header.tsx` and `src/components/dashboard/ProjectsDashboard.tsx`

## Changes

1. `tailwind.config.js` & `src/index.css`
   - Change: Extend `studio` color tokens with semantic elevations (`studio.canvas: #090b10`, `studio.surface: #111420`, `studio.panel: #161a28`, `studio.card: #1c2236`, `studio.border: rgba(255,255,255,0.08)`). Add glass utilities (`.glass-panel`, `.glass-card`), ambient depth shadows, and custom sleek scrollbars.
   - Preserve: Existing font family definitions and Tailwind compatibility.
   - Verify: `npx tsc --noEmit` and clean build.

2. `src/components/dashboard/ProjectsDashboard.tsx` & `ProjectCard.tsx`
   - Change: Polish dashboard with high-contrast glassmorphic header, live workspace stats, clear search with `Ctrl+K` hint, quick-launch 4BHK/3BHK blueprint sample cards, and architectural grid preview graphics for empty project thumbnails.
   - Preserve: Project loading, duplication, export, and deletion logic.
   - Verify: Project list renders smoothly with interactive cards and working modals.

3. `src/components/header/Header.tsx`
   - Change: Unify 3D Orbit / 2D Plan / Walk into a sleek segmented control with illuminated active pill. Add live animated autosave beacon (green = saved, amber pulse = saving). Refine WebMCP status badge and Export dropdown.
   - Preserve: Camera angle selection, WebMCP tool execution, and undo/redo history.
   - Verify: Seamless switching between 3D orbit, 2D plan angles, and 1st-person walk.

4. `src/components/sidebar/LeftSidebar.tsx`, `SpacesPanel.tsx`, `CatalogPanel.tsx`, `MaterialsPanel.tsx`, `AgentCopilotPanel.tsx`
   - Change: Upgrade 60px glass rail with edge-lit active tab indicator. Enhance `SpacesPanel` with room preset cards, directional compass buttons, and L-shaped notch preview. Refine `CatalogPanel` with category tags and smooth placement. Style `MaterialsPanel` with swatch grids. Polish `AgentCopilotPanel` chat bubbles.
   - Preserve: Scene graph connection, tool calls, and room creation geometry.
   - Verify: Adding spaces, furniture, and materials functions without error.

5. `src/components/inspector/InspectorPanel.tsx`
   - Change: Categorized collapsible sections for Transform (color-coded X/Y/Z axes), Dimensions & Scale (ft/in display with `tabular-nums`), Finishes, and Openings. Replace blank empty state with an Architectural Residence Overview.
   - Preserve: Precise coordinate movement, rotation, scaling, and notch resizing.
   - Verify: Inspecting furniture and rooms accurately updates transforms and dimensions.

6. `src/canvas/StudioCanvas.tsx` & `CADBlueprintOverlay.tsx`
   - Change: In `StudioCanvas`, refine WebGPU stats card with glass styling and add viewport shortcuts. In `CADBlueprintOverlay`, consolidate floating buttons into a unified glass CAD command ribbon.
   - Preserve: Three.js WebGPU rendering, raycasting, drag-and-drop, and 2D SVG blueprint drafting.
   - Verify: 60+ FPS rendering and responsive drafting.

7. `src/components/toast/AgentActionFeed.tsx`, `ConfirmationDialog.tsx`, `AgentBridgeModal.tsx`
   - Change: Modern glass toast notifications with status-colored border glows, high-contrast human-in-the-loop confirmation modal, and developer WebMCP bridge playground.
   - Preserve: Confirmation promise resolution and toast auto-dismiss.
   - Verify: Triggering agent tools shows clear feedback and confirmation gates.

## Scope

- Inherit: All dashboard, studio viewport, inspector, and sidebar components.
- Verify: Interactive 3D scene, WebMCP tool bridge, 2D CAD overlay, room creation tests.
- Exclude: Core geometry algorithms (`roomGeometry.ts`, Three.js shaders) to protect computational correctness.

## Validation

- Product: Full 3D house design workflow (create rooms, connect spaces, place furniture, switch 2D/3D views, export).
- Interface: Verified at desktop resolutions (1920x1080, 1440x900, 1280x800).
- System: Adheres to `baseline-ui` and `improve-ui` contracts.
- Repository: `npm test` → 100% pass; `npx tsc --noEmit` → zero errors.

## Stop conditions

- Stop if any WebMCP tool registration breaks or 3D scene raycasting ceases to respond.
