# Adaptive Grid Layout System

## Status
Draft v2

## Purpose
This document defines the current intended layout direction for AppBuilder.

The design direction has changed from:
- fixed subsection templates
- section-specific `full / left / right` logic

to:
- a full-canvas grid
- fixed columns
- dynamic rows
- fixed row height
- visual freeform resizing and movement inside bounded grid occupancy
- runtime-safe structured layout as the canonical truth

This document is a working design draft and is expected to evolve.

## Core Goal
The editor should feel visually flexible and customizable, but the saved layout model must still be structured enough for:
- web preview
- Kotlin runtime
- future export/codegen

The grid is the structure.
It replaces both:
- raw freeform `x/y/scale` as runtime truth
- overly rigid fixed subsection templates

## High-Level Model

### Canonical Layout Model
The whole phone canvas is a grid.

The grid has:
- a fixed number of columns
- dynamic rows
- a fixed row height

Blocks occupy rectangular grid areas using:
- column start
- row start
- column span
- row span

### Editor Interaction Model
The user should not feel like they are dragging only by rigid grid steps.

Instead:
- the user resizes visually in freeform pixels
- the user moves the block around visually
- the editor interprets that visual intent
- the system resolves it to the nearest valid grid occupancy

This means:
- freeform as input
- grid as saved runtime output

## v1 Grid Decision

### Columns
The canvas uses:
- **8 columns**

Why:
- more expressive than 4 columns
- much less noisy than 12 columns
- enough flexibility for small, medium, and large blocks on mobile

### Rows
The canvas uses:
- **dynamic rows**

Rows are created as needed as content grows downward.

This means:
- the page can become longer than one screen
- vertical scrolling is allowed

### Row Height
The grid uses:
- **80px fixed row height**

This is the starting value, not a permanently locked decision.
It should be evaluated visually once the grid is implemented.

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
The runtime should save structured grid occupancy, not arbitrary pixel position.

Proposed direction:

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
The user may still visually resize a block to a custom pixel size.

That custom render size may also be saved, but it should **not** become the primary layout truth.

Instead it should be treated as bounded render metadata inside the assigned grid occupancy.

Possible direction:

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

## Block Sizing Model

### User Experience
The user can resize a block visually to a custom pixel size.

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

### Important Rule
The runtime should not depend on the raw pixel size alone.
The raw visual size is only valid within the context of the occupied grid area.

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
- no automatic pushing other blocks around in v1
- no hidden reflow of neighboring blocks

### Resize
If a resize would cause the block to occupy already occupied cells:
- **deny the resize**

This keeps the system easy to understand.

## Content Growth Rules

### Text and other vertically growing content
If content inside a block grows and the block needs more room:
- the block should increase its `rowSpan`
- it should not overflow
- it should not overlap nearby content

### If rows below are free
- expand into more rows

### If rows below are blocked
- deny the content change
- or prompt the user to rearrange/rescale

Suggested user-facing behavior:
- show a message explaining that the block needs more space
- ask the user to resize or rearrange nearby content

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

## Span Rules by Block Family
The exact rules should remain adjustable, but v1 needs sensible defaults.

### Hero
- default: `8 x 3`
- min: `8 x 2`
- max: `8 x 5`
- full-width only

### Text
- default: `3 x 2`
- min: `2 x 1`
- max: `8 x 6`
- allowed to auto-grow vertically

### Nav Button
- default: `2 x 1`
- min: `1 x 1`
- max: `3 x 1`
- should remain compact

### Services List
- default: `8 x 3`
- min: `3 x 2`
- max: `8 x 6`
- allowed to grow vertically

### Image Gallery
- default: `8 x 3`
- min: `3 x 2`
- max: `8 x 6`

### Contact Form
- default: `8 x 4`
- min: `4 x 3`
- max: `8 x 8`
- allowed to grow vertically

These should be treated as a starting point, not final rules.

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
- content growth rules
- bounded movement rules

This is still much better than raw `x/y`, but it is not trivial.

### 3. Mixed content pressure
Some blocks, especially text-heavy ones, can grow unpredictably.
The growth rules must be implemented consistently or the system will feel arbitrary.

## v1 Non-Goals
To keep the first implementation manageable, avoid:
- auto-packing other blocks when collisions happen
- arbitrary overlap
- deeply nested internal grids
- block families with no span constraints
- multiple competing layout systems at once

## Suggested v1 Scope
v1 should support:
- full-canvas 8-column grid
- dynamic rows
- 80px row height
- visual free resize
- snapped occupancy resolution
- denied collisions
- bounded inner movement
- text/content auto-growth when space exists
- user-facing rejection when it does not

That is enough to validate the model before adding more advanced behavior.

## Open Questions
These still need explicit decisions:

1. What exact pixel gap exists between columns and rows?
2. How much of the grid should be visible at rest?
3. Should the user see the snapped span preview during resize in real time?
4. Should inner movement use direct drag or alignment presets first?
5. When text growth is blocked, do we deny the change immediately or allow temporary warning state?

## Summary
The current intended direction is:
- full-canvas grid
- 8 fixed columns
- dynamic rows
- 80px row height
- grid occupancy as runtime truth
- custom px render size as bounded render metadata
- centered by default inside the occupied area
- optional user movement within that area
- collision denied
- content growth handled by increasing row span when space allows

This gives the editor more customization freedom while keeping the runtime model structured and portable.

