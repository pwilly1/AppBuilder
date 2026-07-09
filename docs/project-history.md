# Project History

This document summarizes the major evolution of Apptura. Git remains the source of truth for exact diffs and commit metadata.

## Purpose

Use this file to understand why the project is shaped the way it is today. It is intentionally shorter than a full commit log.

## Phase 1: Repository And Auth Foundation

Date range: August 2025

The project began with repository setup and backend authentication work. Core auth services, user repository logic, session handling, and backend configuration were introduced.

Important outcome:

```text
The app gained user identity, which made project ownership and protected APIs possible.
```

Representative areas:

- `backend/src/services/AuthService.ts`
- `backend/src/services/SessionManager.ts`
- `backend/src/repositories/UserRepository.ts`
- `backend/src/routes/AuthRoutes.ts`

## Phase 2: Project Persistence Foundation

Date range: September 2025

Backend project storage and service layers were added. Projects became first-class persisted records rather than local-only editor state.

Important outcome:

```text
The editor could become a real app builder because project data had a backend home.
```

Representative areas:

- `backend/src/models/Project.ts`
- `backend/src/repositories/MongoProjectRepository.ts`
- `backend/src/services/ProjectManager.ts`
- `backend/src/routes/ProjectRoutes.ts`

## Phase 3: Web Builder Foundation

Date range: September to October 2025

The project gained the first React/Vite builder surface, shared block rendering, a dashboard, and a three-column editor shell.

Important outcome:

```text
Apptura became a recognizable web app builder instead of only backend services.
```

Representative areas:

- `frontend/src/App.tsx`
- `frontend/src/layout/EditorLayout.tsx`
- `frontend/src/shared/BlockRenderer.tsx`
- `frontend/src/shared/blocks/*`
- `frontend/src/pages/Dashboard.tsx`

## Phase 4: Editing Safety And Multi-Page Apps

Date range: November to December 2025

Undo/redo, autosave behavior, project deletion, and multi-page editing were added.

Important outcome:

```text
The builder became safer to use and capable of representing multi-screen apps.
```

Representative areas:

- `frontend/src/hooks/useProject.ts`
- `frontend/src/components/PagesPanel.tsx`
- `frontend/src/layout/EditorLayout.tsx`

Later note:

The original monolithic `useProject.ts` hook was later split into focused `hooks/project/*` modules for history, page actions, block actions, persistence, and shared utilities while keeping the exported `useProject` API stable for the editor.

## Phase 5: Native Preview Initiative

Date range: December 2025 to February 2026

Native preview work started, with Android becoming the active preview target. The Android app was connected to backend login/project loading and gained Kotlin schema models and Compose renderers.

Important outcome:

```text
Saved web projects could be consumed by a native preview app.
```

Representative areas:

- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/MainActivity.kt`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/models/SchemaModels.kt`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/*`

## Phase 6: Business Blocks And Broader MVP Experimentation

Date range: March 2026

The editor expanded with services, contact form, and image gallery blocks. The backend added contact submission support and optional email notification behavior.

Important outcome:

```text
The product explored a more business-focused builder direction.
```

Representative areas:

- `frontend/src/shared/blocks/ServicesList.tsx`
- `frontend/src/shared/blocks/ContactForm.tsx`
- `frontend/src/shared/blocks/ImageGallery.tsx`
- `backend/src/services/EmailNotificationService.ts`

Current note:

These business blocks still exist, but the near-term public-demo direction favors stable atomic blocks and templates instead of large complex blocks.

## Phase 7: Grid Layout Transition

Date range: April 2026 onward

The editor moved away from fragile freeform placement toward a structured grid contract shared by web and Android.

Important outcome:

```text
The project established `layout.grid + render` as the preferred runtime layout model.
```

Key concepts:

- 16-column grid
- fixed 29-row phone-style editor workspace
- snapped placement and resizing
- collision prevention
- bounded render metadata
- migration from older layout data
- Android grid-renderer parity work with edge-to-edge grid sizing and shared row defaults

Representative areas:

- `frontend/src/shared/schema/gridLayout.ts`
- `frontend/src/shared/schema/gridMigration.ts`
- `frontend/src/shared/schema/types.ts`
- `frontend/src/editor/PageRenderer.tsx`
- `frontend/src/editor/Preview.tsx`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/layout/GridLayout.kt`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt`

## Phase 8: Deployment And Public Demo

Date range: May to June 2026

The project was deployed with Azure Static Web Apps for the frontend, Azure App Service for the backend, MongoDB Atlas for persistence, and GitHub Actions for CI/CD.

Important outcome:

```text
Apptura became a hosted project that can be shown publicly instead of only a local development app.
```

Representative areas:

- `.github/workflows/azure-static-web-apps-delightful-desert-04350a50f.yml`
- `.github/workflows/deploy-backend.yml`
- `docs/deployment.md`

## Phase 9: Editor And Runtime Polish

Date range: June 2026 onward

Recent work has focused on improving the deployed demo, editor organization, route protection, header/editor toolbar cleanup, direct editing behavior, content scaling behavior, a focused lightweight primitive block set, richer inspector styling controls, and Android/web visual parity. Redundant Label, Divider, and Spacer block types were removed to keep the base library concise.

Important outcome:

```text
The project is moving from prototype capability toward a cleaner demo and more maintainable editor/runtime architecture.
```

Representative areas:

- `frontend/src/components/Header.tsx`
- `frontend/src/components/Projects.tsx`
- `frontend/src/layout/EditorLayout.tsx`
- `frontend/src/editor/*`
- `frontend/src/shared/schema/contentScale.ts`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/RenderScale.kt`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/RenderTypography.kt`

## Current Strategic Direction

The project is currently centered on:

```text
public demo quality
+ stable core editor behavior
+ schema parity between web and Android
+ clean documentation
```

The recommended next phase is to add atomic blocks and design containers/templates carefully before expanding into app export, app-store automation, offline-first runtime, compliance, plugin SDK, or GenAI generation.

## Phase 10: Container Hierarchy Milestone

Date range: June 2026

Recent work introduced a schema-backed `container` block, flat `parentId` hierarchy, editor child-editing mode, drag-to-place palette behavior, load-time hierarchy repair, and matching container rendering in web and Android preview.

Important outcome:

```text
The project is starting the transition from isolated atomic blocks toward composed layouts without giving up the shared schema contract.
```

The next phase is to stabilize the container UX, keep Android/web parity tight, and use that foundation for template insertion work instead of adding broader section complexity too early.

Representative areas:

- `frontend/src/shared/schema/blockHierarchy.ts`
- `frontend/src/shared/schema/gridMigration.ts`
- `frontend/src/editor/PageRenderer.tsx`
- `frontend/src/layout/EditorLayout.tsx`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt`

## Phase 11: Static Template Catalog

Date range: June 2026

Recent work added static editor-time templates built from existing containers and atomic blocks. The architecture includes section, page, and app template scaffolding, while the visible catalog is currently limited to a small set of section templates.

Important outcome:

```text
Users can start from reusable section patterns without introducing new runtime block types or breaking Android preview parity.
```

Representative areas:

- `frontend/src/shared/schema/templates.ts`
- `frontend/src/AddBlock.tsx`
- `frontend/src/layout/EditorLayout.tsx`
- `frontend/src/hooks/useProject.ts`

Later note:

Template insertion still enters the editor through `useProject.ts`, but the underlying state and persistence logic now live in focused `hooks/project/*` modules instead of one large hook file.

## Phase 12: Atomic Media Block

Date range: June 2026

The editor gained a schema-backed atomic Image block. It supports pasted image URLs, local image uploads, fit modes, focal-position controls, borders, corner radius, opacity, and matching web/Android preview rendering. The upload path now supports backend asset storage so saved projects can keep asset URLs in the block schema instead of embedding raw image data in MongoDB project documents.

Important outcome:

```text
The base block library now supports normal image placement without relying on the older Image Gallery business block.
```

Representative areas:

- `frontend/src/shared/schema/registry.ts`
- `frontend/src/shared/blocks/ImageBlock.tsx`
- `frontend/src/components/Inspector.tsx`
- `backend/src/services/AssetStorageService.ts`
- `backend/src/routes/ProjectRoutes.ts`
- `native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/ImageBlockView.kt`

## Phase 13: Project Hook Responsibility Split

Date range: July 2026

Recent work split the large frontend project-state hook into focused modules for history, page actions, block actions, persistence, and shared utilities, while keeping the exported `useProject` contract stable for the rest of the editor.

Important outcome:

```text
The editor keeps the same behavior and API surface, but the project-state implementation is easier to navigate and change safely.
```

Representative areas:

- `frontend/src/hooks/useProject.ts`
- `frontend/src/hooks/project/useProjectHistory.ts`
- `frontend/src/hooks/project/useProjectPages.ts`
- `frontend/src/hooks/project/useProjectBlocks.ts`
- `frontend/src/hooks/project/useProjectPersistence.ts`
- `frontend/src/hooks/project/projectUtils.ts`

## Phase 14: Schema-Backed Form Submission Flow

Date range: July 2026

Recent work introduced a new top-level `form` block, a schema-backed `submitButton` trigger, reusable field primitives (`input`, `textarea`, `checkbox`, `toggle`) with `fieldKey`-based submission mapping and optional `submitGroupId` grouping, backend `AppSubmission` persistence, public submission routes, and a dashboard submissions viewer for saved projects.

Important outcome:

```text
The shared schema now supports a real flexible app-user submission flow without falling back to the older fixed contact-form block shape.
```

Representative areas:

- `frontend/src/shared/blocks/FormBlock.tsx`
- `frontend/src/shared/blocks/SubmitButton.tsx`
- `frontend/src/shared/blocks/formRuntime.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/shared/schema/blockHierarchy.ts`
- `backend/src/models/AppSubmission.ts`
- `backend/src/services/AppSubmissionService.ts`
- `backend/src/routes/ProjectRoutes.ts`
