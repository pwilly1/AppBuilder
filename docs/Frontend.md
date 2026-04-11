# Frontend `src` Map

This file explains what each file in `app-builder/frontend/src` is responsible for today.

The frontend is currently centered around an **8-column grid-based editor and preview model**:

- grid placement is stored in `layout.grid`
- bounded render metadata is stored in `render`
- legacy freeform placement still exists as a fallback for older projects during the transition

## Top-level files

### [main.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/main.tsx)
Vite entrypoint. Mounts the React app into the DOM and pulls in the global stylesheet.

### [App.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/App.tsx)
Top-level app shell and router.

Responsibilities:
- bootstraps auth state from the saved token
- creates the project state API with `useProject`
- wires routes for landing, dashboard, account, and editor
- passes project/editor actions down into `EditorLayout`
- owns the global `Header` and `Footer`

### [api.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/api.ts)
Backend API client utilities.

Responsibilities:
- auth token helpers
- project CRUD calls
- login/signup related requests
- general fetch wrappers used by the frontend

### [AddBlock.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/AddBlock.tsx)
Small block-library UI used in the editor sidebar.

Responsibilities:
- lists available block types
- creates new block instances from the shared registry
- calls the editor add-block callback

### [PageList.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/PageList.tsx)
Older page-list UI component.

Note:
- this is largely superseded by `components/PagesPanel.tsx`
- keep it in mind as transitional code rather than the preferred page-management component

### [PageRenderer.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/PageRenderer.tsx)
Core editor canvas.

Responsibilities:
- renders the editable phone canvas
- draws the grid overlay
- handles block selection
- handles drag preview and snapped drop behavior
- handles resize preview and snapped resize behavior
- handles bounded inner movement via the dedicated move handle
- resolves block resting position using `layout.grid + render`
- still contains some transition logic for legacy placement fallback

This is the most important file in the current editor interaction model.

### [index.css](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/index.css)
Global stylesheet for the frontend.

Responsibilities:
- app shell layout
- editor chrome and panels
- canvas/grid visuals
- block selection states
- shared utility styles used across the frontend

### [vite-env.d.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/vite-env.d.ts)
Standard Vite TypeScript environment definitions.

## `components/`

### [components/Header.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Header.tsx)
Top navigation/header bar.

Responsibilities:
- auth controls
- undo/redo buttons
- save button/status
- global app actions shown across the frontend

### [components/Footer.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Footer.tsx)
Global footer for the app shell.

### [components/Landing.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Landing.tsx)
Marketing/landing page content shown at `/`.

### [components/Login.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Login.tsx)
Login form UI.

### [components/Signup.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Signup.tsx)
Signup form UI.

### [components/Projects.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Projects.tsx)
Projects list/grid UI used from the dashboard flows.

### [components/PagesPanel.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/PagesPanel.tsx)
Current page-management panel for the editor.

Responsibilities:
- list pages
- select page
- add page
- rename page
- delete page

### [components/Inspector.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/components/Inspector.tsx)
Right-side block inspector.

Responsibilities:
- edit the currently selected block’s props
- show block-specific form fields
- save edits back into project state
- delete the selected block

## `pages/`

### [pages/Dashboard.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/pages/Dashboard.tsx)
Authenticated dashboard screen.

Responsibilities:
- list/open projects
- bridge into the editor flow

### [pages/Account.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/pages/Account.tsx)
Account/settings page UI.

## `layout/`

### [layout/EditorLayout.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/layout/EditorLayout.tsx)
Main editor workspace layout.

Responsibilities:
- three-column editor composition:
  - left rail: structure + block library
  - center: canvas/preview
  - right rail: inspector
- toggles preview mode
- passes editor actions into `PageRenderer`

## `editor/`

### [editor/Preview.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/editor/Preview.tsx)
Web preview renderer.

Responsibilities:
- renders a phone-sized preview from the current page blocks
- prefers `layout.grid + render`
- falls back to legacy placement for older blocks that have not migrated yet

This is the web-side preview counterpart to the Android native preview.

## `hooks/`

### [hooks/useProject.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/hooks/useProject.ts)
Main project-state hook.

Responsibilities:
- owns project state, history, selection, and autosave
- loads and normalizes backend project data
- runs load-time grid migration for older projects
- exposes actions for:
  - add/edit/delete block
  - add/select/rename/delete page
  - open/load/save project
  - undo/redo

If `PageRenderer.tsx` is the interaction engine, `useProject.ts` is the editor state engine.

## `shared/`

### [shared/BlockRenderer.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/BlockRenderer.tsx)
Shared block switchboard.

Responsibilities:
- chooses the correct block component for a `Block`
- is used by both the editor canvas and the preview renderer

## `shared/blocks/`

These are the concrete UI renderers for each block type.

### [shared/blocks/Hero.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/blocks/Hero.tsx)
Hero block UI.

### [shared/blocks/TextBlock.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/blocks/TextBlock.tsx)
Text/content block UI.

### [shared/blocks/NavButton.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/blocks/NavButton.tsx)
Navigation button block UI.

### [shared/blocks/ServicesList.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/blocks/ServicesList.tsx)
Services/cards list block UI.

### [shared/blocks/ContactForm.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/blocks/ContactForm.tsx)
Contact form block UI.

### [shared/blocks/ImageGallery.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/blocks/ImageGallery.tsx)
Image gallery block UI.

## `shared/schema/`

This folder contains the shared layout/schema logic that the editor and preview depend on.

### [shared/schema/types.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/types.ts)
Canonical frontend schema types.

Responsibilities:
- project/page/block types
- grid placement and render metadata types

Important note:
- this file is now grid-first
- the remaining transition debt is around legacy freeform fallback, not section-model schema types

### [shared/schema/registry.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/registry.ts)
Block registry and block factory.

Responsibilities:
- defines each block type
- default props
- layout class
- grid constraints
- default render metadata
- `createBlock(...)`

This is the main source of truth for block defaults.

### [shared/schema/gridLayout.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/gridLayout.ts)
Core grid math utilities.

Responsibilities:
- grid constants
- placement rect math
- pixel size to span quantization
- span clamping
- collision detection
- first-fit placement for new blocks
- render clamping inside a placement
- final render rect resolution

This is the shared logic that makes the current grid model work.

### [shared/schema/gridMigration.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/gridMigration.ts)
Load-time migration for older projects.

Responsibilities:
- preserve existing `layout.grid`
- normalize grid placements to the current grid rules
- assign grid placement to legacy blocks that only have old visual placement data
- fill in default render alignment values

### [shared/schema/runtimeLayout.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/runtimeLayout.ts)
Legacy/transitional layout helpers.

Responsibilities:
- read old editor/freeform placement values
- support fallback behavior for older projects

Important note:
- this is still useful during migration, but it is not the long-term layout model anymore

## Current architecture notes

### Current source of truth
Preferred:
- `layout.grid`
- `render`

Still present for compatibility:
- `editorPlacement`
- `props.x`
- `props.y`
- `props.scaleX`
- `props.scaleY`

### Most important files for the current grid editor
If someone new is onboarding, start here:
1. [hooks/useProject.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/hooks/useProject.ts)
2. [shared/schema/types.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/types.ts)
3. [shared/schema/registry.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/registry.ts)
4. [shared/schema/gridLayout.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/gridLayout.ts)
5. [shared/schema/gridMigration.ts](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/shared/schema/gridMigration.ts)
6. [PageRenderer.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/PageRenderer.tsx)
7. [editor/Preview.tsx](/C:/Users/prwil/Documents/AppBuilder/app-builder/frontend/src/editor/Preview.tsx)

### Known transition debt
- legacy freeform fallback still exists
- some older files are still present for compatibility rather than as the preferred path
