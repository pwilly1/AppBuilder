# Agent Notes

This file gives Codex/AI agents and future collaborators the current working context for Apptura.

Use this after reading the root [README](../README.md).

## Current Project Direction

Apptura is a schema-driven low-code mobile app builder with:

- React web editor
- Express backend
- MongoDB persistence
- Kotlin/Jetpack Compose Android preview
- Azure-hosted frontend/backend deployment

The active product focus is:

```text
stable public demo
+ reliable core editor behavior
+ web/Android schema parity
+ clean documentation
```

## Current Layout Direction

The active layout model is grid-first.

Canonical layout data:

```text
block.layout.grid
block.render
block.props
```

Current grid constants:

```text
columns: 16
default editor rows: 29
default Android preview rows: 29 minimum, then grow to fit viewport/content
row height: 28
gap: 0
web editor padding: 0 horizontal, centered vertical inset
Android preview padding: 0
```

Container hierarchy now also exists in the live schema:

```text
Block.parentId
```

Do not treat legacy freeform fields as the preferred runtime truth.

Legacy compatibility fields still exist:

```text
editorPlacement
props.x
props.y
props.scaleX
props.scaleY
```

## Important Constraints

- Keep web editor, web preview, and Android preview aligned.
- Do not reintroduce section-first layout as the primary architecture without a deliberate design decision.
- Do not remove migration/fallback paths until old projects are tested.
- Do not claim planned strategic features are implemented unless the code supports them.
- Update docs when architecture, deployment, schema, or roadmap changes.
- Image file uploads should use the backend asset upload path when storage is configured; saved blocks store the returned URL in `props.src`. Data URLs are only a local/unsaved fallback.
- Text is display-only unless `props.editable === true`. Editable Text, Checkbox, and Toggle become live fields when nested inside a `form` block or explicitly selected by a same-page `button` using `submitData`.
- Shared interactive behavior flows through `props.action`; Button can be static, navigate, submit, open URLs, or set page variables, while Icon and Image support the applicable tap actions.
- Project-level `dataCollections` are part of the saved schema. Submit Data buttons may target a collection, while Text and Hero may read the latest or one creator-selected record from publicly readable collections in web and Android preview.
- Pages may define text `stateVariables`, while Text/Hero bindings may resolve either a stable variable ID or a stable project collection/field ID in web and Android. Collection bindings read either the latest record or one specific record chosen by the app creator from a publicly readable collection; bindings without a selector default to latest. Set Page Variable can use a fixed value or a live editable-Text value referenced by block ID. Generated-app users now have project-scoped signup/login/logout Button actions and separate runtime JWT sessions; authenticated submissions store optional app-user ownership. Current-user bindings, private per-user queries, profile editing, and password recovery remain planned.
- Pages may also define `appearance.backgroundColor`; keep page-surface color behavior aligned across the Pages workspace, web canvas, web preview, and Android preview, with white fallback behavior preserved for older or malformed data.
- The left editor rail is now a tabbed workspace: Pages for page management, Blocks for insertion/templates, and Data for page variables plus project collections. Keep workflow docs and QA steps aligned with that split.
- The public `/editor/demo` route is now a four-screen `FieldReady` sample app that exercises containers, page backgrounds, navigation, checkbox/toggle state, and live page-variable binding with persistence intentionally disabled.

## Current Block Inventory

Visible editor palette today:

- Hero
- Text
- Button
- Badge
- Icon
- Shape
- Image
- Progress Bar
- Form
- Checkbox
- Toggle
- Container

Business/demo-experiment blocks still present in code but not the preferred public-demo direction:

- Services List
- Contact Form
- Image Gallery

## Key Docs

- [Architecture](architecture.md)
- [API Reference](api-reference.md)
- [Block and Schema Reference](block-reference.md)
- [How to Add a Block](how-to-add-a-block.md)
- [Container and Template System](container-template-system.md)
- [Dynamic Data Binding](dynamic-data-binding.md)
- [Deployment](deployment.md)
- [Features](features.md)
- [Roadmap](roadmap.md)
- [Project History](project-history.md)

## Key Frontend Files

| File | Purpose |
| --- | --- |
| `app-builder/frontend/src/App.tsx` | Routing, auth state, project hook wiring |
| `app-builder/frontend/src/demo/demoProject.ts` | One-click `FieldReady` demo fixture and demo-route schema contract |
| `app-builder/frontend/src/hooks/useProject.ts` | Stable public project hook that composes the focused project hooks below |
| `app-builder/frontend/src/hooks/project/useProjectHistory.ts` | Undo/redo snapshots and shared project change application |
| `app-builder/frontend/src/hooks/project/useProjectPages.ts` | Selected-page state and page create/rename/delete flows |
| `app-builder/frontend/src/hooks/project/useProjectBlocks.ts` | Block selection, mutation, placement, and reorder flows |
| `app-builder/frontend/src/hooks/project/useProjectPersistence.ts` | Load/save/autosave behavior plus auth/session checks |
| `app-builder/frontend/src/hooks/project/projectUtils.ts` | Initial-project setup, normalization, path helpers, and remembered project ids |
| `app-builder/frontend/src/shared/schema/pageAppearance.ts` | Shared page background-color normalization and default fallback |
| `app-builder/frontend/src/layout/EditorLayout.tsx` | Editor shell and toolbar |
| `app-builder/frontend/src/editor/PageRenderer.tsx` | Canvas rendering and interactions |
| `app-builder/frontend/src/editor/DraggableBlock.tsx` | Block movement/resizing behavior |
| `app-builder/frontend/src/editor/InlineBlockEditor.tsx` | Direct text editing behavior |
| `app-builder/frontend/src/editor/Preview.tsx` | Web preview renderer |
| `app-builder/frontend/src/components/DataCollectionsPanel.tsx` | Project-level collection editor and public-read settings |
| `app-builder/frontend/src/shared/runtime/useCollectionDataRuntime.ts` | Web page-level loading for directly bound collections |
| `app-builder/frontend/src/shared/schema/gridLayout.ts` | Grid math and collision logic |
| `app-builder/frontend/src/shared/schema/registry.ts` | Block defaults and constraints |
| `app-builder/frontend/src/shared/schema/contentScale.ts` | Shared content scale helper |
| `app-builder/frontend/src/shared/actions/blockActions.ts` | Shared block-action normalization and legacy fallback resolution |
| `app-builder/frontend/src/shared/actions/webActionExecutor.ts` | Web preview action execution for navigation, submit, and URL actions |

## Key Backend Files

| File | Purpose |
| --- | --- |
| `app-builder/backend/src/index.ts` | Express app setup, CORS, routes, Mongo connection |
| `app-builder/backend/src/config/index.ts` | Env variable loading |
| `app-builder/backend/src/routes/AuthRoutes.ts` | Auth endpoints |
| `app-builder/backend/src/auth/AuthContracts.ts` | Shared auth validation, normalization, and controlled error contracts |
| `app-builder/backend/src/middleware/authRateLimits.ts` | Auth endpoint rate limits and shared 429 response shape |
| `app-builder/backend/src/routes/ProjectRoutes.ts` | Authenticated project CRUD routes |
| `app-builder/backend/src/routes/AssetRoutes.ts` | Project image-upload route |
| `app-builder/backend/src/routes/AppDataRoutes.ts` | Authenticated and public hosted app-data routes |
| `app-builder/backend/src/controllers/ProjectController.ts` | Project HTTP adapter |
| `app-builder/backend/src/controllers/AssetController.ts` | Asset-upload HTTP adapter |
| `app-builder/backend/src/controllers/AppDataController.ts` | Hosted app-data HTTP adapter |
| `app-builder/backend/src/models/AppSubmission.ts` | Schema-backed submission persistence model |
| `app-builder/backend/src/services/AppDataService.ts` | Schema-backed app-data validation, persistence, queries, and CSV helpers |
| `app-builder/backend/src/services/ProjectManager.ts` | Typed project mutation behavior including `dataCollections` persistence |
| `app-builder/backend/src/services/AppSubmissionService.ts` | Legacy form-submission compatibility aliases |
| `app-builder/backend/src/services/AssetStorageService.ts` | Azure Blob Storage upload helper for project images |
| `app-builder/backend/src/services/AuthService.ts` | Auth behavior |
| `app-builder/backend/src/services/AppUserAuthService.ts` | Generated-app account signup/login behavior |
| `app-builder/backend/src/services/AppUserTokenService.ts` | Project-scoped generated-app JWT contract |
| `app-builder/backend/src/services/ProjectManager.ts` | Typed project ownership and mutation behavior |
| `app-builder/backend/src/services/JwtService.ts` | JWT creation and validation helper |

## Key Android Files

| File | Purpose |
| --- | --- |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/MainActivity.kt` | Native app entry and project loading |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/models/SchemaModels.kt` | Kotlin schema models |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/layout/GridLayout.kt` | Android grid math |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt` | Android page preview |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/*View.kt` | Compose block renderers |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/BlockActions.kt` | Android shared block-action resolution and execution |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/RenderScale.kt` | Android content scaling helper |
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/RenderTypography.kt` | Android typography helper |

## Safe Next-Step Priorities

Good next steps:

1. keep public demo stable
2. test core block editing/resizing thoroughly
3. keep Android parity close after each schema change
4. stabilize the new container primitive before broader templates
5. design templates carefully before rebuilding business blocks
6. document decisions when architecture changes

Risky changes:

- broad rewrites of editor interaction logic without tests/manual checklist
- changing grid constants without updating web, Android, and docs
- adding complex blocks that should be templates or containers
- removing legacy migration code too early
- treating future strategic features as current product capabilities
- adding dynamic bindings, state, or generated-app user behavior without following `dynamic-data-binding.md`

## Recommended Agent Workflow

```text
1. Inspect relevant files first.
2. Explain the intended change briefly.
3. Edit the smallest safe set of files.
4. Run the relevant build/check command when possible.
5. Summarize what changed and what was not tested.
```
