# Architecture

This document explains how Apptura is structured today and which design decisions matter when changing the system.

## System Overview

Apptura has three main runtime surfaces:

```text
React web editor
  -> Express API
  -> MongoDB Atlas
  -> Azure Blob Storage for uploaded image assets

Android native preview
  -> Express API
  -> MongoDB Atlas
  -> remote image URLs from saved block schema
```

The central product idea is schema-driven app creation. The web editor saves a project schema, and preview/runtime clients render that schema.

## Repository Structure

```text
app-builder/frontend/src
  components/      Reusable UI pieces and editor side panels
  editor/          Canvas, draggable block, inline editor, preview, geometry helpers
  hooks/           Project state and persistence logic
  layout/          Editor page composition
  pages/           Route-level pages such as dashboard/account
  shared/          Block renderers and shared schema logic

app-builder/backend/src
  config/          Environment variable loading
  controllers/     Auth controller
  middleware/      Request authentication helpers
  models/          Mongoose models
  repositories/    Data access abstractions
  routes/          Express routes
  services/        Auth, project, email/session services

app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview
  layout/          Android grid math
  models/          Kotlin project/block schema models
  navigation/      Project preview screen and page switching
  renderers/       Compose renderers for block types
```

## Data Flow

### Editing a project

1. The user logs in and opens a project from the dashboard.
2. The frontend loads the project through `GET /projects/:id`.
3. `useProject` owns project state, selected page/block state, undo/redo, and save behavior.
4. The editor renders the active page through `EditorLayout` and `PageRenderer`.
5. Block changes update frontend state and are saved back through `PATCH /projects/:id`.
6. MongoDB stores the project schema.

### Uploading image assets

1. The image inspector sends a selected file to `POST /projects/:id/assets/images`.
2. The backend verifies the user owns the project and rejects guests.
3. The backend validates the MIME type and size.
4. Azure Blob Storage stores the image bytes under a project-scoped blob path.
5. The backend returns an asset URL.
6. The Image block stores that URL in `props.src`.

This keeps large image bytes out of the MongoDB project document. Pasted remote image URLs are still stored directly in `props.src`. Local data URLs remain only as a development/unsaved-project fallback.

### Rendering a project

1. A page contains ordered blocks.
2. Each block has `type`, `props`, optional `parentId`, optional `layout`, and optional `render` metadata.
3. `BlockRenderer` chooses the correct block component for the block type.
4. Page-level hierarchy helpers split top-level blocks from container children before rendering.
5. Web preview and Android preview both prefer the grid/render layout contract.

## Current Project Schema

The main frontend schema lives in `app-builder/frontend/src/shared/schema/types.ts`.

A project contains pages, and pages contain blocks:

```ts
type Project = {
  schemaVersion: number
  id: string
  name: string
  pages: Page[]
}

type Page = {
  id: string
  title?: string
  path?: string
  blocks: Block[]
}
```

A block has:

```ts
type Block = {
  id: string
  type: BlockType
  parentId?: string
  props: Record<string, any>
  layout?: BlockRuntimeLayout
  render?: BlockRenderMetadata
  editorPlacement?: BlockEditorPlacement
}
```

## Layout Model

The active layout model is grid-first.

Current grid constants:

```text
columns: 16
default editor rows: 29
default Android preview rows: 29 minimum, then grow to fit viewport/content
row height: 28px / 28dp
gap: 0
web editor padding: 0px horizontal, centered vertical inset
Android preview padding: 0dp
Android reference canvas width: 390dp
```

The canonical layout fields are:

```text
block.layout.grid
block.render
```

Meaning:

- `layout.grid` defines the occupied grid area.
- `render` defines the block's rendered size and offset inside that occupied area.
- `props` defines the content and block-specific styling.

The web implementation is in `gridLayout.ts`; the Android counterpart is in `GridLayout.kt`.
The current parity target is shared column/span math with matching edge-to-edge grid surfaces, not pixel-identical frame chrome.

For container children, `layout.grid` is relative to the parent container span rather than the page. The parent relationship is stored separately in `parentId`.

## Grid Placement

Grid placement uses:

```ts
type GridPlacement = {
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
}
```

Important behavior:

- New blocks are assigned the first available valid placement.
- Dragging snaps blocks to grid positions.
- Resizing snaps block bounds to grid dimensions.
- Collision detection prevents overlap.
- The editor canvas uses a fixed phone-style row budget, so placements are normalized back inside the visible workspace.
- Blocks are clamped so they cannot render outside their occupied grid area.

## Render Metadata

Render metadata allows controlled visual flexibility inside the occupied grid area:

```ts
type BlockRenderMetadata = {
  widthPx?: number
  heightPx?: number
  offsetX?: number
  offsetY?: number
  alignX?: 'start' | 'center' | 'end'
  alignY?: 'start' | 'center' | 'end'
}
```

This is intentionally not the same as raw freeform page-level `x/y` positioning. The grid defines the allowed area; render metadata controls how the block sits inside that area.

## Content Scaling

Core blocks support two resize behaviors:

```text
boxOnly       resize the block bounds only
scaleContent  resize the block bounds and scale content from a captured base span
```

The frontend helper is `shared/schema/contentScale.ts`.
The Android helper is `renderers/RenderScale.kt`.

The goal is parity: if a user chooses `scaleContent`, web preview and Android preview should both derive content scale from the same saved schema fields.

## Block Registry

`shared/schema/registry.ts` is the source of truth for block defaults:

- display name
- default props
- default layout metadata
- grid constraints
- default render metadata

The visible add-block panel currently exposes:

- Hero
- Text
- Nav Button
- Badge
- Icon
- Shape
- Progress Bar
- Input
- Textarea
- Image
- Checkbox
- Toggle
- Container

Hero, Text, Nav Button, Shape, and Image are still the main public-demo blocks. The lighter primitives above are also available now, while the older business blocks remain in the codebase but are not the preferred public-demo direction.

Behavior notes:

- Nav Button now stores both navigation props and simple visual style props in the shared schema so web and Android previews stay aligned.
- Badge, Icon, Progress Bar, Checkbox, and Toggle are schema-backed primitives with shared frontend and Android renderers.
- Image is a schema-backed media primitive with pasted URL and backend-uploaded asset URL sources, fit, focus, border, radius, and opacity controls across web and Android preview.
- Input, Textarea, Checkbox, and Toggle are currently schema-backed visual primitives for mockup/design use, not connected form-processing blocks.
- Container is a schema-backed layout primitive. It owns supported child blocks through `parentId`, exposes optional surface styling, and renders children in relative grid coordinates on both web and Android.

## Frontend Responsibilities

Key files:

| File | Responsibility |
| --- | --- |
| `App.tsx` | Router, auth state, project hook wiring |
| `hooks/useProject.ts` | Project state, loading, saving, undo/redo, page/block actions |
| `layout/EditorLayout.tsx` | Editor shell: toolbar, left panel, canvas, inspector |
| `editor/PageRenderer.tsx` | Canvas rendering and editor interactions |
| `editor/DraggableBlock.tsx` | Per-block selection, movement, resizing behavior |
| `editor/InlineBlockEditor.tsx` | Direct text editing on the canvas |
| `editor/Preview.tsx` | Web preview rendering |
| `shared/BlockRenderer.tsx` | Block type switchboard |
| `shared/schema/blockHierarchy.ts` | Container hierarchy validation, repair, coordinate conversion, and resize helpers |
| `shared/schema/gridLayout.ts` | Grid math, collisions, placement, render rect resolution |
| `shared/schema/gridMigration.ts` | Load-time migration for older project data, including filtering unsupported legacy block types removed from the registry and repairing invalid container hierarchy data |

## Backend Responsibilities

The backend provides:

- auth routes under `/auth`
- project routes under `/projects`
- project image upload under `/projects/:id/assets/images`
- public project routes under `/public`
- MongoDB persistence through Mongoose
- JWT session validation
- optional email notification support for contact submissions
- Azure-backed image asset storage for saved-project uploads

Important files:

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Express app setup, CORS, routes, MongoDB connection |
| `src/config/index.ts` | Environment variables |
| `src/routes/AuthRoutes.ts` | Signup/login/session endpoints |
| `src/routes/ProjectRoutes.ts` | Project CRUD and public project routes |
| `src/services/AssetStorageService.ts` | Azure Blob Storage upload logic for project image assets |
| `src/services/ProjectManager.ts` | Project business logic |
| `src/services/AuthService.ts` | Authentication logic |
| `src/services/SessionManager.ts` | JWT/session behavior |

## Android Preview Responsibilities

The Android preview app is a native runtime that loads saved projects and renders them with Jetpack Compose.

Important files:

| File | Responsibility |
| --- | --- |
| `MainActivity.kt` | App entry, login/project loading flows |
| `models/SchemaModels.kt` | Kotlin versions of project/page/block schema, including `parentId` |
| `layout/GridLayout.kt` | Android grid math matching the web model |
| `navigation/ProjectPreviewScreen.kt` | Page preview, scrollable canvas, navigation |
| `renderers/BlockRenderer.kt` | Kotlin block type switchboard |
| `renderers/*View.kt` | Compose block renderers |
| `renderers/RenderScale.kt` | Content scale helper |
| `renderers/RenderTypography.kt` | Typography helper for closer CSS/Compose parity |

## Legacy Compatibility

The project still contains compatibility fields from earlier freeform/editor experiments:

```text
editorPlacement
props.x
props.y
props.scaleX
props.scaleY
```

These are transitional. New architecture work should prefer:

```text
layout.grid
render
props
```

Container hierarchy is also transitional but now part of the current schema contract:

```text
Block.parentId
```

## Important Design Decisions

### Grid-first layout

The grid is used because the same saved schema must render consistently across web and native preview surfaces.

### No overlap by default

The editor currently prevents overlapping occupied grid cells. This keeps the runtime model simpler and makes Android parity easier.

### Atomic blocks before complex sections

Complex business sections should eventually be built as compositions/templates from smaller primitives instead of becoming large one-off block types.

### Flat page block list with parent references

Container work keeps `Page.blocks` flat and derives ownership through `parentId` rather than storing nested page JSON trees. That keeps migration, saving, and Android parity closer to the existing project model.

### AI should operate on schema

Planned GenAI features should generate or edit the same project schema the editor already understands. AI should not create a separate app format.

## Current Architecture Risks

- `PageRenderer` and related editor files still contain complex interaction logic.
- Legacy fallback fields still exist for older project compatibility.
- Android/web parity needs continued testing as block behavior evolves.
- Container editing is live but still constrained to one level; nested containers, reusable template instances, and user-created templates remain unfinished.

## Related Documentation

- [Block and Schema Reference](block-reference.md) - exact project, block, layout, and migration contract
- [How to Add a Block](how-to-add-a-block.md) - required implementation path across web and Android
- [API Reference](api-reference.md) - current backend route surface
