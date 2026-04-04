# Adaptive Grid Layout System

## Status
Current working design and implementation reference

## Purpose
This document describes the active layout architecture for AppBuilder as it exists in the current codebase.

The project moved away from:
- section-first layout exploration
- fixed subsection templates
- universal `full / left / right` slot logic

and is now centered on:
- a full-canvas grid
- structured grid occupancy as runtime truth
- bounded render metadata inside occupied grid areas
- drag/resize behavior that resolves into valid grid placement

## Current Implementation Snapshot

### Implemented
- full-canvas grid overlay in the editor
- `8` columns
- dynamic rows
- `56px` fixed row height
- `0` grid gap
- `16px` padding
- drag ghost preview
- blocked placement denial
- snapped placement commit on valid drop
- resize quantization through the grid preview path
- bounded inner movement using a dedicated handle
- preview rendering from `layout.grid + render`
- load-time migration from older non-grid projects

### Not currently active
- content auto-grow on save
- semantic font-size resize for text-like blocks

Those were explored and intentionally backed out. The current stable baseline is the grid foundation without those behaviors.

## Core Goal
The editor should feel visually flexible and customizable, while the saved layout stays structured enough for:
- web preview
- Kotlin runtime
- future export/codegen

The grid is the active structure.
It replaces:
- raw freeform `x/y/scale` as long-term runtime truth
- rigid template-only subsection models

## High-Level Model

### Canonical Layout Model
The whole phone canvas is a grid.

The grid has:
- a fixed number of columns
- dynamic rows
- a fixed row height

Blocks occupy rectangular areas using:
- `colStart`
- `rowStart`
- `colSpan`
- `rowSpan`

### Editor Interaction Model
The user should not feel locked to manual cell-by-cell editing.

Instead:
- the user drags visually
- the user resizes visually
- the user can move a block inside its occupied area
- the editor resolves that interaction into valid grid occupancy plus bounded render metadata

This means:
- visual editing as input
- grid occupancy as canonical saved output

## Current Grid Decision

### Columns
The canvas uses:
- **8 columns**

### Rows
The canvas uses:
- **dynamic rows**

Rows extend downward as needed.
This means:
- the page can be taller than one screen
- vertical scrolling is allowed

### Row Height
The current grid uses:
- **56px fixed row height**

This is the live implementation value in the shared grid constants.

## Why This Model
This model is meant to balance:

### Flexibility
- users can create more varied layouts
- blocks do not all expose the same fixed subsection choices
- visual editing still feels creative

### Structure
- runtime does not depend on arbitrary pixel coordinates
- editor and runtime can share the same occupancy model
- collisions and resizing can be validated cleanly

### Predictability
- spans are explicit
- row height is consistent
- the page grows vertically instead of overflowing unpredictably

## Canonical Saved Layout
The runtime should save structured grid occupancy, not arbitrary global pixel positioning.

Current direction:

```ts
layout: {
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
}
```

This is the runtime truth.

## Render Metadata
The user may still visually resize or nudge a block to a custom rendered size/offset within its occupied area.

That render information may be saved, but it should **not** become the primary layout truth.

Instead it should be treated as bounded render metadata inside the assigned grid occupancy.

Current direction:

```ts
render: {
  widthPx?: number
  heightPx?: number
  offsetX?: number
  offsetY?: number
  alignX?: 'start' | 'center' | 'end'
  alignY?: 'start' | 'center' | 'end'
}
```

Important:
- `layout` determines where the block is allowed to exist
- `render` determines how the block sits inside that occupied area
- `render` is clamped so the block stays within its occupied area

## Block Sizing Model

### User Experience
The user can resize a block visually.

Example:
- `220px x 180px`
- `315px x 120px`
- or any other visually chosen size

### System Behavior
The system then maps that chosen visual size to the nearest valid grid occupancy.

Example:
- custom visual size may resolve to `2 x 2`
- another may resolve to `3 x 1`
- another may resolve to `8 x 3`

This means:
- the user gets visual flexibility
- the runtime still gets structured spans

## Default Alignment Inside Occupancy
By default, a block should be:
- **centered inside its assigned grid area**

This gives a better initial result than forcing top-left alignment.

## Bounded Inner Movement
After a block is assigned to a grid area, the user should be able to move it around inside that area.

This movement should:
- be allowed only within that occupied area
- be clamped so the block cannot leave the area
- never spill into neighboring occupied cells

This gives more creative flexibility without breaking structure.

### Good model
- occupancy decides the allowed region
- block can move within that region

### Bad model
- block can move freely across the canvas after occupancy is chosen

## Collision Rules

### Placement
If a user drags a block into occupied cells:
- **deny the placement**

There should be:
- no overlap
- no automatic pushing other blocks around

### Resize
If a resize would cause the block to occupy already occupied cells:
- **deny the resize**

This keeps the system easy to understand.

## Current Block Constraints
The shared registry currently defines default/min/max spans per block family.

### Hero
- default: `8 x 3`
- min: `8 x 2`
- max: `8 x 5`

### Text
- default: `4 x 2`
- min: `2 x 1`
- max: `8 x 6`

### Nav Button
- default: `2 x 1`
- min: `1 x 1`
- max: `4 x 1`

### Services List
- default: `8 x 3`
- min: `4 x 2`
- max: `8 x 6`

### Image Gallery
- default: `8 x 3`
- min: `4 x 2`
- max: `8 x 6`

### Contact Form
- default: `8 x 4`
- min: `6 x 3`
- max: `8 x 8`

## Why This Is Better Than Raw x/y/scale
This grid model solves much of the old layout instability because:
- placement is constrained
- movement is bounded
- sizing resolves to valid occupancy
- runtime can render from spans, not pixels

This is not just `x/y` with better visuals.
It is a different layout model:
- structured occupancy instead of arbitrary placement

## What This Model Is Not

### It is not:
- a freeform artboard
- raw `x/y` as runtime truth
- fixed universal `full / left / right` slots
- one permanent visible giant grid at all times

### It is:
- a grid-based runtime model
- visually flexible during editing
- structured at save time
- compatible with runtime-first architecture

## Resting vs Editing States

### At Rest
The fine-grained grid does not need to be fully visible.

The editor should look calm and readable:
- subtle guides
- clear block framing
- not a noisy engineering grid all the time

### During Drag / Resize
The relevant grid should become more visible:
- highlight valid occupancy
- show ghost spans
- show where the block will snap
- show rejected/occupied areas as invalid

This is where the grid becomes an active editing tool.

## Quantization Rules
The system needs a deterministic way to convert visual size into grid occupancy.

### Example process
1. user resizes visually in px
2. editor measures intended width and height
3. editor compares that size to:
   - column width
   - row height
   - block min/max span rules
4. editor chooses the nearest valid `colSpan` and `rowSpan`
5. editor previews the resulting span before finalizing

This quantization step is central to the system.

## Runtime Considerations
If the runtime uses the same:
- 8-column model
- row height rules
- gap rules
- span rules

then editor/runtime parity should be much better than under freeform coordinate placement.

This model should be used consistently by:
- web editor
- web preview
- Kotlin runtime

Otherwise the parity problem returns.

## Main Risks

### 1. Can become too mechanical
A strict grid can start to feel like:
- widgets on a dashboard
- cards on a board

instead of:
- a polished app screen

This can be mitigated through:
- strong default spans
- visual hierarchy
- better block styling
- not treating every block like an equal tile

### 2. Grid logic complexity
The system needs:
- occupancy validation
- span quantization
- collision checks
- bounded movement rules

This is still much better than raw `x/y`, but it is not trivial.

## v1 Non-Goals
To keep the first implementation manageable, avoid:
- auto-packing other blocks when collisions happen
- arbitrary overlap
- deeply nested internal grids
- block families with no span constraints
- multiple competing layout systems at once

## Current Scope
The current stable baseline supports:
- full-canvas 8-column grid
- dynamic rows
- 56px row height
- visual free resize
- snapped occupancy resolution
- denied collisions
- bounded inner movement
- preview/runtime-facing grid render rect resolution
- migration of older projects into the grid model on load

## Open Questions
These still need explicit decisions:

1. What exact pixel gap exists between columns and rows?
2. How much of the grid should be visible at rest?
3. How much of the legacy freeform fallback should remain before Android catches up?
4. Should text-like blocks eventually resize by semantic typography changes instead of transform scale?
5. When content-growth is revisited, should it be per-block-type or global?

## Summary
The current intended direction is:
- full-canvas grid
- 8 fixed columns
- dynamic rows
- 56px row height
- grid occupancy as runtime truth
- custom px render size as bounded render metadata
- centered by default inside the occupied area
- optional user movement within that area
- collision denied

This gives the editor more customization freedom while keeping the runtime model structured and portable.

