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
- Pure TypeScript shared contracts compiled into frontend/backend consumers

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
- Project-level `dataCollections` are part of the saved schema. Submit Data buttons may target a collection, while Text and Hero may read the latest public record, one creator-selected public record, or the signed-in generated-app user's newest owned record in web and Android preview.
- Button may create-or-update or delete the signed-in app user's newest owned collection record. `saveCurrentUserRecord` is the canonical save action; normalize legacy `updateCurrentUserRecord` actions into it. Keep field mapping, own-record access validation, delete confirmation, and post-mutation binding refresh aligned across web and Android.
- Pages may define text `stateVariables`, while Text/Hero bindings may resolve either a stable variable ID or a stable project collection/field ID in web and Android. Collection bindings use `latest`, `specific`, or `currentUser` selectors; bindings without a selector default to latest. Set Page Variable can use a fixed value or a live editable-Text value referenced by block ID. Generated-app users have project-scoped signup/login/logout Button actions and separate runtime JWT sessions; authenticated submissions store optional app-user ownership. Current-user bindings require `read: "own"` or `read: "public"` and resolve the newest owned record. Basic profile editing is supported through current-user save/delete actions; end-user record selection and password recovery remain planned.
- Owner-facing app-data record routes must serialize through `AppDataRecordOwnerViewService`: expose the safe `submittedBy` classification, scope user lookup to the current project, and omit raw ownership aliases and authentication secrets. Public/runtime record routes must continue using `serializePublicAppDataRecord` and must not expose submitter identity.
- Owner record browsing must remain bounded. Use `listAppDataRecordPage` and cursor-based API navigation for interactive record lists; do not reintroduce an unbounded browser fetch. Treat whole-source CSV generation and cross-page search as separate workflows.
- Pages may also define `appearance.backgroundColor`; keep page-surface color behavior aligned across the Pages workspace, web canvas, web preview, and Android preview, with white fallback behavior preserved for older or malformed data.
- Pages may define `access.mode` as `public`, `signedIn`, or `signedOut`, plus an optional redirect page. Web and Android preview navigation must use the shared access rules, preserve login return targets, and fail safely on invalid/cyclic redirects. Treat this as a navigation guard only; backend access policies remain the security boundary.
- The left editor rail is now a tabbed workspace: Pages for page management, Blocks for insertion/templates, and Data for page variables plus project collections. Keep workflow docs and QA steps aligned with that split.
- The public `/editor/demo` route is now a five-screen `FieldReady` sample app that exercises portable atomic blocks, containers, page backgrounds, page access, navigation, checkbox/toggle state, live page-variable binding, and a project collection schema with persistence intentionally disabled.
- AI generation must follow `ai-app-generation.md`: the production editor prompt flow, deterministic page compiler, authenticated backend proposal boundary, and two-attempt bounded correction loop are implemented. The backend supports both the fake provider and a backend-only OpenAI Responses API adapter behind the same validated model-client interface. Keep no initial RAG, no direct model-authored project writes, exact model-proposed grid placement only after deterministic validation, preview before apply, stale-proposal protection, and one undoable project transaction. Corrections consume normal quota, preserve all blocks and semantics, and must not split pages or remove blocks. Broader generation scopes remain planned.
- `app-builder/shared` is a narrow framework-free package, not a service. It currently owns the AI plan contract, strict parser, and capability catalog. Keep React/editor state in frontend and credentials, provider calls, authenticated routes, quotas, and persistence in backend.

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
- [Collection List / Repeater](collection-list-repeater.md)
- [AI App Generation](ai-app-generation.md)
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
| `app-builder/frontend/src/shared/runtime/pageAccess.ts` | Shared page-access normalization, redirect, and fallback rules |
| `app-builder/frontend/src/layout/EditorLayout.tsx` | Editor shell and toolbar |
| `app-builder/frontend/src/editor/PageRenderer.tsx` | Canvas rendering and interactions |
| `app-builder/frontend/src/editor/DraggableBlock.tsx` | Block movement/resizing behavior |
| `app-builder/frontend/src/editor/InlineBlockEditor.tsx` | Direct text editing behavior |
| `app-builder/frontend/src/editor/Preview.tsx` | Web preview renderer |
| `app-builder/frontend/src/pages/ProjectData.tsx` | Project Data workspace with collection-schema and hosted-record tabs |
| `app-builder/frontend/src/components/DataCollectionsPanel.tsx` | Reusable project collection schema and access-rule editor |
| `app-builder/frontend/src/components/ProjectDataSummary.tsx` | Compact editor-side collection summary and Data workspace link |
| `app-builder/frontend/src/shared/runtime/useCollectionDataRuntime.ts` | Web page-level loading for directly bound collections |
| `app-builder/frontend/src/shared/schema/gridLayout.ts` | Grid math and collision logic |
| `app-builder/frontend/src/shared/schema/registry.ts` | Block defaults and constraints |
| `app-builder/frontend/src/shared/schema/contentScale.ts` | Shared content scale helper |
| `app-builder/frontend/src/shared/actions/blockActions.ts` | Shared block-action normalization and legacy fallback resolution |
| `app-builder/frontend/src/shared/actions/webActionExecutor.ts` | Web preview action execution for navigation, submit, and URL actions |

## Key Shared Package Files

| File | Purpose |
| --- | --- |
| `app-builder/shared/src/ai/aiCapabilities.ts` | Versioned AI scope, block, action, binding, access, and limit catalog |
| `app-builder/shared/src/ai/aiLayoutGuidance.ts` | Versioned grid guidance and bounded correction limits shared by frontend/backend |
| `app-builder/shared/src/ai/aiTypes.ts` | Framework-free `AppGenerationPlanV1` contract |
| `app-builder/shared/src/ai/parseGenerationPlan.ts` | Strict allowlisted parser for untrusted generation-plan input |
| `app-builder/shared/src/ai/index.ts` | Public `@apptura/shared/ai` export boundary |

## Key Backend Files

| File | Purpose |
| --- | --- |
| `app-builder/backend/src/index.ts` | Express app setup, CORS, routes, Mongo connection |
| `app-builder/backend/src/ai/AiProviderConfig.ts` | Validated fake/OpenAI provider selection plus backend-only model, key, and timeout config |
| `app-builder/backend/src/ai/AiModelClient.ts` | Provider-neutral AI generation interface |
| `app-builder/backend/src/ai/AiContextBuilder.ts` | Privacy-limited project and capability context |
| `app-builder/backend/src/ai/AiGenerationService.ts` | Ownership-aware generation orchestration and strict output validation |
| `app-builder/backend/src/ai/AiGenerationRequest.ts` | Bounded proposal/correction request parsing and diagnostic sanitization |
| `app-builder/backend/src/ai/AiCorrectionContract.ts` | Preserves semantic plan structure while accepting safe layout corrections |
| `app-builder/backend/src/ai/createAiModelClient.ts` | Startup factory that keeps provider selection out of route/controller code |
| `app-builder/backend/src/ai/providers/FakeAiModelClient.ts` | Deterministic provider for tests and no-cost local development |
| `app-builder/backend/src/ai/providers/OpenAiModelClient.ts` | OpenAI Responses API adapter with strict JSON-schema output and refusal handling |
| `app-builder/backend/src/controllers/AiGenerationController.ts` | Authenticated proposal HTTP adapter and safe error contract |
| `app-builder/backend/src/routes/AiGenerationRoutes.ts` | Proposal, correction, and usage routes under `/projects/:projectId/ai` |
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
| `app-builder/backend/src/models/AppDataRecord.ts` | Canonical mutable app-data persistence model with legacy document compatibility |
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
| `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/PageAccess.kt` | Android page-access resolver matching web behavior |
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
