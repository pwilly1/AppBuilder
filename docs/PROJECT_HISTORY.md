# AppBuilder Development History

## Document Status
- Type: Internal engineering history and milestone record
- Scope: Major product and platform milestones, plus full commit-day chronology
- Source basis:
  - Verified milestone sections are based on actual Git history review and targeted diff inspection
  - Appendix chronology is based on the repository commit log
- Audience:
  - product owner
  - engineering
  - future collaborators needing architectural context

## Purpose
This document records how the platform has evolved, why major changes were made, what each milestone delivered, and which architectural issues remain open.

This is intended to function as a business-grade internal history document, not a replacement for Git. Git remains the source of truth for exact diffs and authorship.

## Methodology
This report was prepared using:
- actual Git commit dates
- targeted review of major milestone diffs
- current repository structure and implementation state
- direct implementation context from the most recent development sessions

The document distinguishes between:
- verified milestone analysis, where actual diff content was reviewed
- chronology-only entries, where only commit metadata is preserved in appendix form

## Executive Summary
AppBuilder has moved through six clear phases:

1. Platform foundation
2. Web builder foundation
3. Editing workflow maturation
4. Native preview/runtime foundation
5. Business-feature expansion and cross-surface alignment
6. Grid-layout transition and shared runtime-contract alignment

The platform today includes:
- user authentication
- project persistence
- dashboard and multi-page editing
- drag-based editor interactions
- undo/redo and autosave
- business-oriented blocks
- stored contact form submissions
- optional email notifications
- an active grid-based editor layout foundation
- web preview rendering from `layout.grid + render`
- Android preview/runtime support for the current block set
- a first Android grid-based preview renderer pass

The principal unresolved architecture issue is now this:

- the web editor and preview now use the grid model as the preferred layout path
- the Android preview has begun using the same grid contract
- legacy free-positioned fallback data still exists for compatibility
- the remaining transition debt is now mostly legacy freeform fallback and runtime parity tuning

That means the platform is now materially closer to a shared runtime layout model across web and Android, but still mid-transition.

---

## Milestone Timeline

| Milestone | Date Range | Primary Outcome |
| --- | --- | --- |
| M1 | 2025-08-01 to 2025-08-06 | Repository initialized and authentication services established |
| M2 | 2025-09-21 | Project model, project repository, and service layer added |
| M3 | 2025-09-27 | In-browser builder foundation and schema-based block rendering started |
| M4 | 2025-10-28 | Dashboard and three-column editor shell established |
| M5 | 2025-11-11 to 2025-11-13 | Undo/redo and autosave added to improve editing safety |
| M6 | 2025-12-02 | Multi-page editing model and page management introduced |
| M7 | 2025-12-07 to 2026-02-09 | Native preview initiative launched and Android backend-backed preview enabled |
| M8 | 2026-02-23 | Preview mode and page navigation behavior improved across surfaces |
| M9 | 2026-03-16 | Auth/project API hardening and repo hygiene cleanup completed |
| M10 | 2026-03-17 | Business blocks, form submissions, notifications, and major UI redesign added |
| M11 | 2026-03-21 | Editor routing, persistence, resizing, and interaction model significantly expanded |
| M12 | 2026-03-23 | Android runtime brought closer to web parity for form, gallery, and hero behavior |
| M13 | 2026-04-02 to 2026-04-08 | Web editor shifted to grid-based layout and Android preview gained its first grid renderer |

---

## Verified Major Milestones

### M1. Repository Foundation And Authentication
**Date Range**
- 2025-08-01 to 2025-08-06

**Verified Commits**
- `aaaa61d` - Initial commit
- `2a20096` - auth services working

**Business Objective**
- Establish the repository and bring core user authentication from concept to working service state.

**Execution Summary**
- Initial repository scaffolding and licensing were introduced.
- Backend auth service work expanded the following areas:
  - backend configuration
  - auth controller
  - backend entrypoint
  - user repository
  - auth service
  - session manager
  - backend tests
  - TypeScript config

**Representative Files**
- `app-builder/backend/src/controllers/authController.ts`
- `app-builder/backend/src/services/AuthService.ts`
- `app-builder/backend/src/services/SessionManager.ts`
- `app-builder/backend/src/repositories/UserRepository.ts`
- `app-builder/backend/src/index.ts`

**Why This Was Important**
- Without working auth, the product could not support ownership, persistence, or protected project operations.

**Outcome**
- The platform moved from repository setup to a functional authentication base.

---

### M2. Backend Project Model And Service Layer
**Date**
- 2025-09-21

**Verified Commit**
- `ed0a4e0` - projectManager and AppBuilder

**Business Objective**
- Introduce a real project abstraction and the backend infrastructure needed to create and manage app projects.

**Execution Summary**
- Added the backend project model and repository abstractions.
- Added project routes and project management service logic.
- Expanded backend entry and auth route behavior to support project workflows.

**Representative Files**
- `app-builder/backend/src/models/Project.ts`
- `app-builder/backend/src/repositories/MongoProjectRepository.ts`
- `app-builder/backend/src/repositories/ProjectRepository.ts`
- `app-builder/backend/src/routes/ProjectRoutes.ts`
- `app-builder/backend/src/services/ProjectManager.ts`

**Why This Was Important**
- The app builder needed a stable persistence model before the editor could become more than a local prototype.

**Outcome**
- Backend project storage and management became first-class platform capabilities.

---

### M3. In-Browser Builder Foundation
**Date**
- 2025-09-27

**Verified Commit**
- `0832036` - started in-browser react-native editor setup

**Business Objective**
- Start the web-side builder experience and schema-driven rendering flow.

**Execution Summary**
- Introduced early builder-side rendering infrastructure.
- Added preview and shared block-rendering components.
- Added initial block definitions, including `Hero` and `TextBlock`.
- Updated frontend package configuration and Vite configuration to support the new flow.

**Representative Files**
- `app-builder/frontend/src/editor/Preview.tsx`
- `app-builder/frontend/src/shared/BlockRenderer.tsx`
- `app-builder/frontend/src/shared/BlockTypes.ts`
- `app-builder/frontend/src/shared/blocks/Hero.tsx`
- `app-builder/frontend/src/shared/blocks/TextBlock.tsx`

**Why This Was Important**
- This was the beginning of the schema-first builder model that still underpins the product.

**Outcome**
- The project gained the first real in-browser content rendering path for app-building.

---

### M4. Dashboard And Three-Column Editor Shell
**Date**
- 2025-10-28

**Verified Commit**
- `6d44f68` - added dashboard and full 3-column editor. fix Tailwind v4 setup

**Business Objective**
- Establish a durable product shell for the web application and improve developer styling stability.

**Execution Summary**
- Added a dedicated dashboard.
- Expanded the editor into a three-column workspace.
- Updated App routing/application structure.
- Improved inspector, block addition, project views, and global styles.
- Fixed Tailwind v4 integration issues.

**Representative Files**
- `app-builder/frontend/src/App.tsx`
- `app-builder/frontend/src/pages/Dashboard.tsx`
- `app-builder/frontend/src/components/Inspector.tsx`
- `app-builder/frontend/src/AddBlock.tsx`
- `app-builder/frontend/src/index.css`
- `app-builder/frontend/postcss.config.cjs`
- `app-builder/frontend/tailwind.config.cjs`

**Why This Was Important**
- This created the first recognizable product-grade web shell instead of a loose collection of screens.

**Outcome**
- Dashboard-driven project access and a structured editor workspace became part of the core product experience.

---

### M5. Editing Safety: Undo/Redo And Autosave
**Date Range**
- 2025-11-11 to 2025-11-13

**Verified Commits**
- `5fd2377` - added undo/redo feature
- `4e94b07` - added autosave

**Business Objective**
- Make editing safer and reduce the cost of mistakes or interruption.

**Execution Summary**
- Extended the central frontend app flow to support:
  - undo/redo state transitions
  - autosave behavior

**Representative File**
- `app-builder/frontend/src/App.tsx`

**Why This Was Important**
- Builder products are not trustworthy if edits are easy to lose or hard to reverse.

**Outcome**
- The editor became materially safer for repeated iteration.

---

### M6. Multi-Page Editing Model
**Date**
- 2025-12-02

**Verified Commit**
- `bd0912f` - added multipage feature to app editor, added blocked registry

**Business Objective**
- Move from single-page editing toward real app composition across multiple screens.

**Execution Summary**
- Added page management infrastructure and UI.
- Added/expanded project hooks for page-aware editing.
- Updated editor layout to support multi-page workflows.

**Representative Files**
- `app-builder/frontend/src/components/PagesPanel.tsx`
- `app-builder/frontend/src/hooks/useProject.ts`
- `app-builder/frontend/src/layout/EditorLayout.tsx`
- `app-builder/frontend/src/App.tsx`

**Why This Was Important**
- Business apps are rarely single-screen products.
- Multi-page composition is a baseline requirement for the stated product direction.

**Outcome**
- Multi-page editing became part of the standard builder workflow.

---

### M7. Native Preview Initiative And Android Backend Integration
**Date Range**
- 2025-12-07 to 2026-02-09

**Verified Commits**
- `a25729f` - started native-preview for mobile devices
- `dfa7e25` - native-preview: get Android preview running and load projects from backend

**Business Objective**
- Begin native-side preview/runtime work and connect it to real backend project data.

**Execution Summary**
- Native preview initiative began with a broad preview/runtime code introduction.
- Initial implementation included an iOS/Swift preview branch of exploration.
- Android runtime later became the active preview path and was connected to:
  - backend login
  - project listing
  - backend project loading
- Android manifest and build configuration were updated to support networking and preview execution.

**Representative Files**
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/MainActivity.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/models/SchemaModels.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/BlockRenderer.kt`

**Why This Was Important**
- Native preview is central to the product vision.
- It validated that projects created on the web could be consumed by a native runtime client.

**Outcome**
- The Android preview became a real backend-connected application surface.

**Architectural Note**
- The December native-preview milestone also shows an earlier Swift/iOS exploration path.
- The more recent direction is clearly Kotlin/Android-first.

---

### M8. Preview Mode And Navigation Behavior
**Date**
- 2026-02-23

**Verified Commit**
- `407bdf4` - added preview mode toggle with nav button page switching

**Business Objective**
- Improve runtime-like testing inside the builder and across preview surfaces.

**Execution Summary**
- Added preview mode toggle behavior to the web editor flow.
- Added `navButton` block behavior and page switching support.
- Updated schema, registry, renderer flow, and preview implementation on both web and Android.

**Representative Files**
- `app-builder/frontend/src/PageRenderer.tsx`
- `app-builder/frontend/src/layout/EditorLayout.tsx`
- `app-builder/frontend/src/shared/blocks/NavButton.tsx`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/NavButtonView.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt`

**Why This Was Important**
- Navigation is a foundational runtime behavior.
- Preview mode is necessary for testing page transitions and app logic without leaving the editor context.

**Outcome**
- The builder began behaving more like a runtime test surface rather than a static renderer.

---

### M9. API Hardening And Repository Hygiene
**Date**
- 2026-03-16

**Verified Commit**
- `794f3f8` - Harden auth/project APIs

**Business Objective**
- Reduce avoidable security, deploy, and repository hygiene risk before expanding product functionality further.

**Execution Summary**
- Hardened auth/project backend behavior.
- Updated JWT/session handling.
- Cleaned project route behavior.
- Improved ignore rules and removed tracked generated artifacts and local-machine files.
- Updated top-level documentation.

**Representative Files**
- `app-builder/backend/src/config/index.ts`
- `app-builder/backend/src/routes/ProjectRoutes.ts`
- `app-builder/backend/src/services/SessionManager.ts`
- `README.md`
- `.gitignore`

**Why This Was Important**
- Security and operational hygiene problems become more expensive to fix as feature work grows.

**Outcome**
- The platform became safer to run and cleaner to maintain.

---

### M10. Business Block Expansion, Submission Pipeline, And Product Redesign
**Date**
- 2026-03-17

**Verified Commit**
- `dbf2685` - Add business blocks and form submissions flow, and redesign UI

**Business Objective**
- Shift the product from generic editor prototype toward a small-business MVP that could collect real user signal.

**Execution Summary**
- Added business-oriented blocks:
  - `contactForm`
  - `imageGallery`
  - `servicesList`
- Extended schema typing and registry defaults.
- Expanded inspector behavior substantially for richer block editing.
- Added backend form submission handling and project submission storage.
- Added email notification service support.
- Expanded dashboard capability.
- Performed a broad frontend redesign.
- Added Android renderer support for the new business blocks.

**Representative Files**
- `app-builder/frontend/src/shared/blocks/ContactForm.tsx`
- `app-builder/frontend/src/shared/blocks/ImageGallery.tsx`
- `app-builder/frontend/src/shared/blocks/ServicesList.tsx`
- `app-builder/frontend/src/components/Inspector.tsx`
- `app-builder/frontend/src/pages/Dashboard.tsx`
- `app-builder/backend/src/models/Project.ts`
- `app-builder/backend/src/routes/ProjectRoutes.ts`
- `app-builder/backend/src/services/EmailNotificationService.ts`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/ContactFormView.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/ImageGalleryView.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/ServicesListView.kt`

**Why This Was Important**
- This was the first milestone where the product began to resemble a vertical-usable builder instead of a generic content editor.

**Outcome**
- The platform gained:
  - more realistic business blocks
  - real contact submission handling
  - optional email notification support
  - a materially stronger visual presentation

---

### M11. Editor Interaction, Routing, Persistence, And Resize Model Expansion
**Date**
- 2026-03-21

**Verified Commit**
- `19ef2c5` - Improve editor UX with submissions flow, visual redesign, routing fixes, and resizable blocks, other misc. fixes

**Business Objective**
- Improve day-to-day editor usability and reduce friction in the main build workflow.

**Execution Summary**
- Expanded editor interaction logic in the page renderer.
- Improved app routing and project reload behavior.
- Reworked `useProject` substantially.
- Expanded auth UI and onboarding experience.
- Further refined styling and editor shell behavior.
- Added richer resizing behavior and ongoing canvas interaction work.

**Representative Files**
- `app-builder/frontend/src/PageRenderer.tsx`
- `app-builder/frontend/src/hooks/useProject.ts`
- `app-builder/frontend/src/App.tsx`
- `app-builder/frontend/src/layout/EditorLayout.tsx`
- `app-builder/frontend/src/components/Inspector.tsx`
- `app-builder/frontend/src/components/Login.tsx`
- `app-builder/frontend/src/components/Signup.tsx`
- `app-builder/frontend/src/index.css`

**Why This Was Important**
- The builder's value depends heavily on editing feel, save confidence, and navigation reliability.

**Outcome**
- The product became more usable for actual iterative editing, not just one-pass demonstrations.

**Architectural Risk Introduced/Exposed**
- The editor now saves richer free-positioned layout data and interactive resize state.
- This increased the gap between web editor behavior and native runtime behavior.

---

### M12. Android Runtime Parity Improvements
**Date**
- 2026-03-23

**Verified Commit**
- `0d87f46` - Improved editor interactions and aligned Android runtime with form, gallery, and hero updates

**Business Objective**
- Close the most visible parity gaps between the web builder/runtime behaviors and the Android preview.

**Execution Summary**
- Updated Android runtime to better align with web behavior for:
  - `contactForm`
  - `imageGallery`
  - `hero`
- Updated Android build configuration.
- Expanded Android schema/model helper behavior.
- Improved preview navigation/title handling.

**Representative Files**
- `app-builder/native-preview/Android/app/build.gradle.kts`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/models/SchemaModels.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/ContactFormView.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/HeroView.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/renderers/ImageGalleryView.kt`

**Why This Was Important**
- The Android runtime had fallen behind the web experience in ways that were visible to users and misleading during preview/testing.

**Outcome**
- Android now better matches the web implementation for:
  - hero sizing
  - gallery image rendering
  - contact form interaction and submission

**Remaining Gap**
- Android still does not honor the web editor's saved absolute canvas layout properties.

---

### M13. Grid-Based Layout Transition Across Web And Android
**Date Range**
- 2026-04-02 to 2026-04-08

**Verified Commits**
- `9dfac88` - switch editor to grid-based placement and preview
- `b038b97` - documentation edits
- `0de159f` - implemented grid-based android preview renderer

**Business Objective**
- Replace the increasingly fragile free-positioned editor model with a structured grid contract that can be shared across web and Android preview surfaces.

**Execution Summary**
- Shifted the web editor from section/subsection experiments into a full-canvas grid model.
- Introduced shared grid schema and math:
  - `layout.grid`
  - `render`
  - grid placement math
  - collision handling
  - placement quantization
  - migration helpers for older projects
- Reworked the editor canvas so drag, resize, and preview behavior operate against snapped grid placement.
- Updated web preview to render from the same grid/render contract.
- Added project-load migration so older free-positioned blocks can be assigned grid placement automatically.
- Added architecture and agent documentation so the new model is explicitly captured in-repo.
- Implemented the first Android/Kotlin grid preview pass:
  - Android schema support for `layout.grid` and `render`
  - Android grid math utilities
  - Android page preview switched from simple vertical stacking to a scrollable grid canvas

**Representative Files**
- `app-builder/frontend/src/PageRenderer.tsx`
- `app-builder/frontend/src/editor/Preview.tsx`
- `app-builder/frontend/src/hooks/useProject.ts`
- `app-builder/frontend/src/shared/schema/types.ts`
- `app-builder/frontend/src/shared/schema/registry.ts`
- `app-builder/frontend/src/shared/schema/gridLayout.ts`
- `app-builder/frontend/src/shared/schema/gridMigration.ts`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/models/SchemaModels.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/layout/GridLayout.kt`
- `app-builder/native-preview/Android/app/src/main/java/com/apptura/nativepreview/navigation/ProjectPreviewScreen.kt`
- `AGENTS.md`
- `docs/adaptive-subsection-system.md`

**Why This Was Important**
- The previous freeform/editor-only layout direction was becoming difficult to align with runtime rendering.
- A shared grid contract is the clearest path toward stable cross-surface parity.
- This milestone turned the grid model from a design direction into live implementation on both web and Android.

**Outcome**
- The web editor now has a real grid-based layout foundation.
- Web preview now prefers the same grid/render model.
- Android preview has its first grid-based renderer instead of only stacking blocks vertically.

**Remaining Gap**
- legacy free-positioned fallback still exists in the web codebase for compatibility
- Android parity still needs block-by-block tuning against the web renderer

---

## Current Platform State

### What The Product Supports Today
- user authentication
- project storage and retrieval
- dashboard-driven project access
- multi-page editing
- block-based builder composition
- undo/redo
- autosave
- preview mode
- business blocks:
  - hero
  - text
  - nav button
  - services list
  - contact form
  - image gallery
- grid-based page layout in the web editor
- grid-based web preview rendering
- stored contact form submissions
- optional email notifications
- Android preview/runtime support for the current block set
- first-pass Android grid preview rendering

### What Is Structurally Strong
- schema-driven block system
- backend project abstraction
- dashboard/editor product shell
- Android preview integration with backend data
- shared grid layout math is now present in both web and Android codepaths
- business-focused MVP capability is now visible

### What Is Still Structurally Weak
- legacy freeform layout fallback still coexists with the new grid model
- Android runtime is not yet fully aligned to the grid layout contract
- parity still requires some tactical compatibility work instead of one fully unified layout engine

---

## Principal Architectural Issue

### Current State
The active editor direction is now a full-canvas grid model with:
- fixed columns
- dynamic rows
- grid occupancy saved in schema
- bounded render metadata inside occupied areas

This model is now active in:
- web editor
- web preview
- Android preview (first pass)

However, the project still carries legacy compatibility fields:
- `x`
- `y`
- `scaleX`
- `scaleY`
- `editorPlacement`

Android also still needs parity tuning and broader adoption of the same rendering assumptions block-by-block.

### Why This Matters
The product is no longer deciding whether to move away from freeform absolute layout.
It is already in the middle of that migration.

The remaining risk is:
- mixed layout paradigms in the codebase
- incomplete runtime alignment
- future maintenance complexity if legacy paths linger too long

### Strategic Recommendation
Long term, the platform should fully converge around:
- `layout.grid`
- `render`
- shared grid math
- shared block constraints

across:
- web editor
- web preview
- Android runtime

Legacy freeform data should remain only as transitional compatibility support, not as canonical layout truth.

---

## Recommended Next Strategic Phase

### Short-Term
- keep the grid editor stable
- tune Android block-by-block parity against the web renderer
- reduce dead transition code
- avoid deepening legacy freeform dependence further

### Medium-Term
- reduce or isolate legacy placement fallback in web
- continue hardening the Android/Kotlin grid renderer

### Long-Term
- unify:
  - web editor
  - web preview
  - Android preview/runtime
  - eventual iOS/runtime export model

around a consistent grid-based layout engine and schema contract

---

## Appendix A: Full Commit-Day Chronology

This appendix preserves the full day-by-day Git chronology for reference.

| Date | Commit | Message |
| --- | --- | --- |
| 2025-08-01 | `aaaa61d` | Initial commit |
| 2025-08-04 | `52d69b0` | user auth started |
| 2025-08-06 | `2a20096` | auth services working |
| 2025-09-21 | `ed0a4e0` | projectManager and AppBuilder |
| 2025-09-27 | `0832036` | started in-browser react-native editor setup |
| 2025-09-30 | `bce8708` | Add PageList sidebar, PageRenderer, and AddBlock panel to editor |
| 2025-10-10 | `c86a79d` | Expand README with project details and guidelines |
| 2025-10-18 | `d538d95` | fixed guest session and opening project |
| 2025-10-18 | `38e7d0a` | Merge branch 'main' of https://github.com/pwilly1/AppBuilder |
| 2025-10-19 | `d3c3d88` | improved interface |
| 2025-10-28 | `6d44f68` | added dashboard and full 3-column editor. fix Tailwind v4 setup |
| 2025-11-05 | `3c110d7` | added draggability and improved UI |
| 2025-11-06 | `5ae7428` | fixed horozontal drag, fixed block persistence |
| 2025-11-07 | `7eeccd6` | updated UI, created landing and account page, created logout button |
| 2025-11-07 | `bf18066` | changed to router based implementation |
| 2025-11-11 | `5fd2377` | added undo/redo feature |
| 2025-11-13 | `4e94b07` | added autosave |
| 2025-11-18 | `70fb294` | small frontend refactor |
| 2025-11-25 | `19e5277` | added ability to delete projects |
| 2025-11-30 | `b72863f` | new page renderer drag and drop system |
| 2025-12-01 | `1361064` | improved editor ui |
| 2025-12-02 | `bd0912f` | added multipage feature to app editor, added blocked registry |
| 2025-12-02 | `007b5f7` | added multipage feature to app editor, added blocked registry |
| 2025-12-07 | `a25729f` | started native-preview for mobile devices |
| 2025-12-07 | `1b40098` | ReadMe and License |
| 2026-01-27 | `5fc0c36` | Android Preview started |
| 2026-02-04 | `1881f01` | Fix native Android preview build |
| 2026-02-09 | `dfa7e25` | native-preview: get Android preview running and load projects from backend |
| 2026-02-23 | `407bdf4` | added preview mode toggle with nav button page switching |
| 2026-03-16 | `794f3f8` | Harden auth/project APIs |
| 2026-03-17 | `dbf2685` | Add business blocks and form submissions flow, and redesign UI |
| 2026-03-21 | `19ef2c5` | Improve editor UX with submissions flow, visual redesign, routing fixes, and resizable blocks, other misc. fixes |
| 2026-03-23 | `0d87f46` | Improved editor interactions and aligned Android runtime with form, gallery, and hero updates |
| 2026-04-02 | `9dfac88` | switch editor to grid-based placement and preview |
| 2026-04-03 | `b038b97` | documentation edits |
| 2026-04-08 | `0de159f` | implemented grid-based android preview renderer |

---

## Appendix B: Maintenance Guidance

Recommended practice for future updates:

1. Add new major milestones only after the relevant work is committed or otherwise stabilized.
2. Base milestone summaries on actual diff review, not memory alone.
3. Keep Appendix A as the full chronology and use the main body only for milestones that changed product or architecture materially.

