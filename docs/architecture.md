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

The frontend and backend toolchains share a small pure TypeScript package at `app-builder/shared`. The editor and authenticated backend AI proposal route consume the same parser and catalog. This package is a source-code boundary, not a fourth deployed service: each consumer compiles or packages the shared code into its own application.

## Repository Structure

```text
app-builder/frontend/src
  components/      Reusable UI pieces and editor side panels
  editor/          Canvas, draggable block, inline editor, preview, geometry helpers
  hooks/           Project state and persistence logic
  layout/          Editor page composition
  pages/           Route-level pages such as dashboard/account
  shared/          Block renderers and shared schema logic

app-builder/shared/src
  ai/              Versioned AI plan types, strict parser, and capability catalog

app-builder/backend/src
  ai/              AI context, provider boundary, proposal validation, and provider adapters
  config/          Environment variable loading
  controllers/     HTTP adapters for auth, projects, assets, app data, and AI proposals
  middleware/      Request authentication helpers
  models/          Mongoose models
  repositories/    Data access abstractions
  routes/          Thin Express route declarations and middleware binding
  services/        Auth, project, app-data, asset, email, and JWT behavior

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
3. `useProject` remains the public editor hook, but it now delegates project state, page actions, block actions, history, and persistence to focused hooks under `hooks/project`.
4. The editor renders the active page through `EditorLayout` and `PageRenderer`.
5. Block changes update frontend state and are saved back through `PATCH /projects/:id`.
6. MongoDB stores the project schema.

### Requesting an AI proposal

1. An authenticated builder posts a bounded prompt to `POST /projects/:projectId/ai/proposals`.
2. `AiGenerationService` loads only a project owned by that builder.
3. `AiContextBuilder` copies a compact structural summary: project name, page metadata and block types, collection field schemas, and the versioned capability catalog. It excludes owner identity, block property contents, app-user accounts, and app-data records.
4. `AiUsageService` atomically reserves one request from the builder's Mongo-backed hourly quota and creates a prompt-free usage attempt record.
5. `createAiModelClient` selects the deterministic fake provider or the backend-only OpenAI provider from validated environment configuration. The OpenAI adapter sends controlled instructions, structural context, and a hashed builder safety identifier through the Responses API with response storage disabled.
6. The service records provider token metadata and success or controlled failure status, enforces request/output bounds, and parses the response with `@apptura/shared/ai`.
7. The route returns a transient proposal with a project context revision, request token usage, and remaining quota. It does not update the project or apply editor changes.

The frontend still uses the local Crew Directory fixture. Connecting the editor dialog to the real proposal endpoint is the next integration milestone.

### Managing project data

Project data is split by scope:

- The editor Data tab owns page-scoped Text variables and shows a compact summary of project collections.
- The project Data workspace owns persistent collection schemas and hosted records.
- Its Collections tab reuses `DataCollectionsPanel` and saves collection changes through `PATCH /projects/:id`.
- Collection saves are serialized so rapid edits cannot overwrite newer collection state with an older request.
- Its Records tab uses the existing app-data APIs for source navigation, record review, search, and CSV export.

This keeps page-local runtime values near the canvas while moving larger project-level data administration out of the narrow editor sidebar.

### Uploading image assets

1. The image inspector sends a selected file to `POST /projects/:id/assets/images`.
2. The backend verifies the user owns the project and rejects guests.
3. The backend validates the MIME type and size.
4. Azure Blob Storage stores the image bytes under a project-scoped blob path.
5. The backend returns an asset URL.
6. The Image block stores that URL in `props.src`.

This keeps large image bytes out of the MongoDB project document. Pasted remote image URLs are still stored directly in `props.src`. Local data URLs remain only as a development/unsaved-project fallback.

### Submitting schema-backed forms

1. A saved schema-backed submission source renders in web preview as either a top-level Form block with child fields or a Button configured with Submit Data and explicit same-page field selections.
2. Each participating field resolves a submission key from `props.fieldKey`, its label, or its block ID.
3. Submit Data button flows resolve the stable field block IDs stored in the button's `action.fields` list.
4. Preview submission posts JSON to `POST /public/projects/:id/app-data/sources/:sourceId/records`; the older `/forms/:blockId/submissions` route remains an alias.
5. The backend locates the owning Form or Submit Data button source, validates required fields, and stores the sanitized payload in MongoDB through `AppDataRecord`.
6. The dashboard can load app-data sources through `GET /projects/:id/app-data/sources`, fetch source records through `GET /projects/:id/app-data/sources/:sourceId/records`, and export them through the matching CSV route.

Legacy `contactForm` blocks still use the older fixed submission shape and optional email notifications. The `form` and `button` with `submitData` are the primary schema-backed paths for flexible app-user data capture.

### Rendering a project

1. A page contains ordered blocks.
2. Each block has `type`, `props`, optional `parentId`, optional `layout`, and optional `render` metadata.
3. `BlockRenderer` chooses the correct block component for the block type.
4. Page-level hierarchy helpers split top-level blocks from container children before rendering.
5. Web preview and Android preview both prefer the grid/render layout contract.

## Current Project Schema

The canonical project/runtime schema currently lives in `app-builder/frontend/src/shared/schema/types.ts`. Cross-process AI request contracts live in `app-builder/shared/src/ai`; moving the entire project schema is a later migration and is not required for the current AI boundary.

A project contains pages, and pages contain blocks:

```ts
type Project = {
  schemaVersion: number
  id: string
  name: string
  pages: Page[]
  dataCollections?: AppDataCollection[]
}

type Page = {
  id: string
  title?: string
  path?: string
  access?: {
    mode: 'public' | 'signedIn' | 'signedOut'
    redirectPageId?: string
  }
  appearance?: {
    backgroundColor?: string
  }
  stateVariables?: PageStateVariable[]
  blocks: Block[]
}
```

Page access is optional for compatibility and defaults to `public`. Web and Android resolve navigation through the same rules: follow a configured redirect, reject redirect cycles, fall back to the first accessible page, and show a controlled unavailable state when no page can be opened. A blocked signed-in page is remembered while the generated-app user visits a login page, then restored after login.

This is a presentation and navigation boundary only. Protected app data still requires backend-generated-app authentication and collection access policies; hiding a page does not authorize an API request.

Project-level app-data collections have stable IDs, names, operation-specific access rules, and typed field definitions. Access rules independently control runtime create, read, update, and delete behavior. Buttons configured with Submit Data can target a collection while selecting same-page fields explicitly; each selection can map to a collection field through `targetFieldKey`. Records use the canonical `AppDataRecord` contract: `collectionId`, optional `ownerAppUserId`, optional source block/page metadata, `data`, `createdAt`, and `updatedAt`. Text and Hero collection bindings read the latest public record, one creator-selected public record, or the newest record owned by the signed-in generated-app user.

`AppDataRecord` intentionally uses the existing MongoDB `appsubmissions` collection. Reads accept documents written by the former `AppSubmission` model, and API responses retain `appUserId`, `formBlockId`, `pageId`, and `submittedAt` aliases while clients migrate. Editing a legacy record upgrades its canonical fields in place. This is one persistence system with a compatibility boundary, not two record stores.

Builder-facing record responses pass through `AppDataRecordOwnerViewService`. It batch-loads generated-app users by ID and project, replaces internal ownership fields with a safe `submittedBy` classification, and never serializes generated-app authentication material. Public and generated-app runtime routes continue using the stricter public record serializer, which omits ownership and submitter identity entirely. CSV export contains the configured collection fields rather than automatically adding account identity.

The owner Records workspace never loads an entire source into browser memory. `GET /projects/:id/app-data/sources/:sourceId/records` uses bounded cursor pagination, with a default page size of 50 and a server maximum of 100. Canonical records have a compound project/source/ID index, and the UI keeps only the active page plus cursor history. Cursor navigation avoids the increasingly expensive database skips caused by deep numbered pages. Search currently filters the active page only; cross-page search and large asynchronous exports remain separate scale work.

A block has:

```ts
type Block = {
  id: string
  type: BlockType
  parentId?: string
  props: Record<string, any>
  bindings?: BlockBindings
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
- Button
- Badge
- Icon
- Shape
- Form
- Progress Bar
- Image
- Checkbox
- Toggle
- Container

Hero, Text, Button, Shape, and Image are still the main public-demo blocks. The lighter primitives above are also available now, while the older business blocks remain in the codebase but are not the preferred public-demo direction.

Behavior notes:

- Button uses the shared block-action contract for static presentation, page navigation, hosted-data submission, safe external URLs, or page-variable updates.
- Badge, Icon, Progress Bar, Checkbox, and Toggle are schema-backed primitives with shared frontend and Android renderers.
- Image is a schema-backed media primitive with pasted URL and backend-uploaded asset URL sources, fit, focus, border, radius, opacity, and optional tap actions across web and Android preview.
- Form is a schema-backed submission surface with shared parent/child layout rules across web and Android preview.
- Button with `submitData` is a schema-backed submission trigger that reads explicit same-page field references in both web and Android preview, then posts them to its own source or a configured project collection.
- Text is display-only by default. Enabling `props.editable` turns the same block into a single-line or multiline runtime field that can participate in Form or Submit Data flows. Checkbox and Toggle remain boolean fields.
- Container is a schema-backed layout primitive. It owns supported child blocks through `parentId`, exposes optional surface styling, and renders children in relative grid coordinates on both web and Android.

### Block Action Contract

Interactive blocks can store one schema-backed action in `props.action`:

```text
navigate   -> targetPageId
submitData -> fields[] containing fieldBlockId and optional targetFieldKey
openUrl    -> HTTPS or HTTP URL
setPageState -> variableId plus RuntimeValueRef
signUpAppUser -> optional display-name field plus email/password field IDs
loginAppUser  -> email/password field IDs
logoutAppUser -> no additional configuration
```

Button supports no action, navigation, submission, current-user record save/delete, generated-app authentication, URL, and page-variable actions; Icon and Image support their applicable tap actions. Generated-app accounts are stored separately from builder accounts and scoped by project ID. Web stores one runtime token per project in local storage; Android stores the matching token in app preferences. `setPageState` can assign a fixed text value or the current value of an editable Text block referenced by stable block ID. A Submit Data button remains the app-data source identity. Save signed-in user data calls an owner-scoped singleton-style endpoint that creates the user's record when absent and updates their newest owned record afterward. Delete Data resolves that newest owned record, confirms destructive deletion, and removes it. Both paths enforce collection policies on the backend and refresh current-user bindings after success. Legacy `updateCurrentUserRecord` schemas normalize to `saveCurrentUserRecord`. Web and Android have separate executors over the same action JSON.

Navigate actions do not select pages directly in preview runtimes. They pass through the shared page-access resolver so buttons cannot bypass signed-in or signed-out page rules. Editor page selection remains unrestricted so creators can configure every page.

### Dynamic Data Binding Foundation

The page-state and first collection-binding slices are implemented. Pages can define stable text state variables, and Text/Hero can bind content either to a variable or directly to a project collection field. A collection binding selects the latest public record, one specific public record chosen by the app creator, or the newest record owned by the signed-in generated-app user. Each page runtime finds all referenced collection-and-selector pairs, deduplicates them, and loads each requested record once; blocks only resolve values from the resulting context. Web and Android use the same schema and fall back to static properties for missing, loading, empty, permission-denied, signed-out, or failed data. Existing bindings without a selector continue using the latest record.

Generated-app identity now supports signup, login, logout, stable app-user IDs, project-scoped runtime JWTs, optional ownership metadata on authenticated submissions, current-user display bindings, owner-scoped create-or-update/delete behavior, and basic profile editing governed by collection access rules. Button mutation actions currently target only the signed-in user's newest owned record. Password recovery, arbitrary end-user-selected record mutation, app-state actions, generic page parameters, and filters/sorting are not implemented. Page-state values reset when the page runtime is recreated and are not persisted as hosted app data. The architecture keeps static properties, runtime bindings, and event actions separate; blocks must not become independent database query clients.

The full proposed schema, lifecycle, security prerequisites, phased rollout, and web/Android parity requirements are documented in [Dynamic Data Binding Architecture](dynamic-data-binding.md). That document is the source of truth for future binding, state, generated-app user, and data-driven page work.

## Frontend Responsibilities

Key files:

| File | Responsibility |
| --- | --- |
| `App.tsx` | Router, auth state, project hook wiring |
| `hooks/useProject.ts` | Stable facade that composes the focused project hooks and preserves the editor-facing API |
| `hooks/project/useProjectHistory.ts` | Project snapshots, undo/redo history, and change application |
| `hooks/project/useProjectPages.ts` | Selected page state plus page create/rename/delete flows |
| `hooks/project/useProjectBlocks.ts` | Block selection, mutations, placement, and reorder flows |
| `hooks/project/useProjectPersistence.ts` | Project loading, saving, autosave, auth/session checks |
| `hooks/project/projectUtils.ts` | Initial project creation, normalization, path helpers, and project-id persistence |
| `layout/EditorLayout.tsx` | Editor shell: toolbar, left panel, canvas, inspector |
| `shared/runtime/pageAccess.ts` | Portable page-access normalization, redirects, and fallback resolution |
| `components/BehaviorBuilder.tsx` | Guided creator UI for configuring block tap behavior without exposing schema-level action details |
| `components/behaviorBuilderUtils.ts` | Pure action validation, eligible-input discovery, and collection-field auto-mapping |
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
- authenticated AI proposal generation under `/projects/:projectId/ai/proposals`
- authenticated AI usage summaries under `/projects/:projectId/ai/usage`
- project image upload under `/projects/:id/assets/images`
- public project routes under `/public`
- project-scoped generated-app account routes under `/public/projects/:id/app-auth`
- MongoDB persistence through Mongoose
- JWT session validation
- schema-backed `form` and Submit Data button storage plus app-data source listing, record retrieval, and CSV export
- optional email notification support for contact submissions
- Azure-backed image asset storage for saved-project uploads

Important files:

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Express app setup, CORS, routes, MongoDB connection |
| `src/config/index.ts` | Environment variables |
| `src/routes/AuthRoutes.ts` | Signup/login/token endpoints |
| `src/routes/AppUserRoutes.ts` | Generated-app signup/login/session endpoints |
| `src/routes/ProjectRoutes.ts` | Authenticated project CRUD routes |
| `src/routes/AiGenerationRoutes.ts` | Authenticated AI proposal route |
| `src/routes/AssetRoutes.ts` | Authenticated project image-upload route |
| `src/routes/AppDataRoutes.ts` | Authenticated and public hosted app-data routes |
| `src/controllers/ProjectController.ts` | Project HTTP request/response handling |
| `src/controllers/AiGenerationController.ts` | AI proposal HTTP request/response and controlled error mapping |
| `src/controllers/AssetController.ts` | Image-upload HTTP request/response handling |
| `src/controllers/AppDataController.ts` | App-data HTTP request/response handling |
| `src/models/AppDataRecord.ts` | Canonical mutable hosted app-data records plus legacy document compatibility |
| `src/services/AppDataService.ts` | App-data source lookup, validation, persistence, queries, and CSV formatting |
| `src/services/AppSubmissionService.ts` | Compatibility aliases for older form-submission terminology |
| `src/services/AssetStorageService.ts` | Azure Blob Storage upload logic for project image assets |
| `src/services/ProjectManager.ts` | Typed project ownership and mutation rules |
| `src/ai/AiGenerationService.ts` | Ownership-aware proposal orchestration, request bounds, shared parsing, and response metadata |
| `src/ai/AiContextBuilder.ts` | Privacy-limited project and capability context for model clients |
| `src/ai/AiModelClient.ts` | Provider-independent model interface |
| `src/ai/AiProviderConfig.ts` | Validated fake/OpenAI provider, model, key, and timeout configuration |
| `src/ai/AiUsageConfig.ts` | Validated account quota and usage reporting configuration |
| `src/ai/AiUsageService.ts` | Account quota reservation, request lifecycle tracking, and usage summaries |
| `src/ai/createAiModelClient.ts` | Startup factory that isolates provider selection from routes and services |
| `src/ai/providers/FakeAiModelClient.ts` | Deterministic no-cost provider used by tests and optional local development |
| `src/ai/providers/OpenAiModelClient.ts` | OpenAI Responses API adapter, controlled instructions, refusal handling, and JSON parsing |
| `src/ai/providers/OpenAiGenerationSchema.ts` | Provider-facing strict JSON schema corresponding to the shared plan contract |
| `src/repositories/AiUsageRepository.ts` | Atomic Mongo quota buckets and usage aggregation |
| `src/models/AiQuotaBucket.ts` | Short-lived per-account hourly quota counters |
| `src/models/AiUsageRecord.ts` | Prompt-free generation status, latency, and token audit records |
| `src/services/AuthService.ts` | Authentication logic |
| `src/services/AppUserAuthService.ts` | Project-scoped generated-app account behavior |
| `src/services/AppUserTokenService.ts` | Generated-app JWT creation and project-scoped validation |
| `src/services/JwtService.ts` | JWT creation and validated payload decoding |

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

AI features produce a constrained generation plan that deterministic Apptura code compiles into the same project schema the editor already understands. The model may propose exact grid positions, but schema, reference, hierarchy, layout, and native-support validation must pass before the editor can preview or apply a proposal.

AI generation will not use RAG in the initial architecture, will not write directly to project storage, and will not create a separate app format. Accepted proposals must enter the existing project history as one undoable transaction.

The deterministic editor prototype implements this boundary with a strict page-scoped fixture: compilation and preview operate on an isolated project value, stale proposals cannot be accepted, and only explicit acceptance enters `applyProjectTransaction`. The versioned plan contract, strict parser, and capability catalog are published internally from `@apptura/shared/ai`, while editor-state compilation, layout repair, final project validation, and preview remain frontend-owned.

The backend exposes an authenticated, ownership-checked proposal route behind a narrow model-client interface. It supports a deterministic fake provider and a backend-only OpenAI adapter with controlled instructions, strict structured output, request timeout configuration, refusal/incomplete-response handling, and a second validation pass through `@apptura/shared/ai`. Mongo-backed account quotas are reserved before provider calls, and prompt-free usage records preserve request status, latency, and provider token totals. Correction requests and editor endpoint integration remain unfinished.

The complete contract, validation loop, security boundary, testing strategy, and phased rollout are documented in [AI App Generation](ai-app-generation.md).

## Current Architecture Risks

- `PageRenderer` and related editor files still contain complex interaction logic.
- Legacy fallback fields still exist for older project compatibility.
- Android/web parity needs continued testing as block behavior evolves.
- Container editing is live but still constrained to one level; nested containers, reusable template instances, and user-created templates remain unfinished.

## Related Documentation

- [Block and Schema Reference](block-reference.md) - exact project, block, layout, and migration contract
- [Collection List / Repeater](collection-list-repeater.md) - implemented first-milestone multi-record layout and row-context architecture
- [AI App Generation](ai-app-generation.md) - current deterministic compiler and backend proposal boundary plus the planned model-backed rollout
- [How to Add a Block](how-to-add-a-block.md) - required implementation path across web and Android
- [API Reference](api-reference.md) - current backend route surface
