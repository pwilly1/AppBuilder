# AGENTS

## Purpose
This file gives coding agents and future collaborators the current working context for AppBuilder.

Use this as the first orientation document when continuing work on another device or in a fresh agent session.

## Project Overview
AppBuilder is a web-based mobile app builder with:
- a browser editor
- backend project persistence
- Android/native preview runtime
- schema-driven block rendering

The product direction is:
- business-focused app creation
- strong editor/runtime parity
- a structured runtime layout model that can later support Android, web preview, and future export targets

## Current Layout Direction
The active layout direction is a **full-canvas adaptive grid**.

This replaces the earlier section/subsection exploration.

### Canonical layout model
- full phone canvas grid
- `8` columns
- dynamic rows
- `56px` fixed row height
- `0` grid gap
- `16px` grid padding

### Runtime truth
The canonical saved layout is:
- `block.layout.grid`
- `block.render`

Meaning:
- `layout.grid` decides occupied area
- `render` decides width/height and offsets inside that area

### Current implementation behavior
- blocks snap to grid occupancy on valid drag/drop
- blocked placement is denied
- resize quantizes to grid occupancy
- blocks can be moved within their occupied area using a dedicated inner-move handle
- preview uses `layout.grid + render`
- old freeform fields still exist as migration fallback

## Important Current Constraints

### Do not reintroduce section-first layout as the main model
Older section-based experiments still exist in some schema/helpers, but the active product direction is the grid model.

### Avoid making raw `x/y/scale` the runtime truth again
Legacy fields still exist for compatibility:
- `props.x`
- `props.y`
- `props.scaleX`
- `props.scaleY`
- `editorPlacement`

These are transitional. They should not become the long-term runtime model again.

### Keep web and Android aligned
When making layout decisions, prefer choices that can be implemented the same way in:
- web editor
- web preview
- Kotlin Android renderer

## Key Frontend Files

### Layout/editor core
- [PageRenderer.tsx](./app-builder/frontend/src/PageRenderer.tsx)
- [Preview.tsx](./app-builder/frontend/src/editor/Preview.tsx)
- [EditorLayout.tsx](./app-builder/frontend/src/layout/EditorLayout.tsx)
- [useProject.ts](./app-builder/frontend/src/hooks/useProject.ts)

### Grid/runtime schema
- [gridLayout.ts](./app-builder/frontend/src/shared/schema/gridLayout.ts)
- [gridMigration.ts](./app-builder/frontend/src/shared/schema/gridMigration.ts)
- [types.ts](./app-builder/frontend/src/shared/schema/types.ts)
- [registry.ts](./app-builder/frontend/src/shared/schema/registry.ts)

### Shared blocks
- [BlockRenderer.tsx](./app-builder/frontend/src/shared/BlockRenderer.tsx)
- `app-builder/frontend/src/shared/blocks/*`

### Historical/legacy layout helper
- [runtimeLayout.ts](./app-builder/frontend/src/shared/schema/runtimeLayout.ts)

This file is still used for fallback placement, but it also contains older section-based helpers that are no longer the active architecture.

## Current Known Technical Debt
- legacy section-era schema/helpers still exist alongside the grid model
- legacy freeform placement data is still written during save for compatibility
- some docs still need occasional sync with the current implementation
- Android runtime still needs a deliberate grid-model implementation pass

## Current Documentation
- [adaptive-subsection-system.md](./docs/adaptive-subsection-system.md)
- [PROJECT_HISTORY.md](./docs/PROJECT_HISTORY.md)

These should be kept aligned with the actual code, especially:
- grid constants
- active architecture direction
- known limitations

## Safe Next-Step Priorities
Good next steps:
1. reduce legacy freeform fallback gradually
2. clean out dead section-era code once the grid model is fully settled
3. implement the same grid model in Android/Kotlin
4. keep docs synchronized with the current implementation

## Risky Changes
Pause and re-check before:
- reintroducing section-slot layout as the primary model
- making all block types behave identically on resize
- changing grid constants without updating docs and constraints
- removing fallback migration paths before verifying older projects still load correctly

## Working Style Notes
- prefer small, stable iterations over broad rewrites
- preserve rollback room when changing core editor behavior
- update docs when architectural direction changes
- keep decisions explicit so work can continue cleanly across devices

## Current Snapshot
As of the current working tree:
- grid foundation is implemented
- migration to grid on load is implemented
- content auto-grow was attempted and rolled back
- semantic text resize was attempted and rolled back
- current state is the stable grid baseline
