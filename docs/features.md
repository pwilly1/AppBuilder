# Features

This document describes what Apptura supports today and which product areas are planned.

## Current User-Facing Features

### Authentication

- Signup
- Login
- JWT-backed session handling
- Protected project routes
- Guest/session support exists in the backend/frontend flow

### Dashboard

- View projects
- Create projects
- Open projects
- Delete projects
- Demo/reviewer-oriented dashboard polish is in progress

### Editor

The current editor includes:

- three-column workspace
- left workspace rail with Pages, Blocks, and Data tabs
- page structure panel inside the Pages tab
- block palette inside the Blocks tab
- page-variable tools and a compact project-collection summary inside the Data tab
- dedicated project Data workspace with separate Collections and Records tabs
- central phone-style canvas
- right-side inspector
- editor toolbar for save, undo, redo, web preview, Android preview setup note, and active-container exit
- sticky left workspace rail on desktop with independent scrolling for long block/data lists
- drag-to-place block palette with click-to-add still available

### Pages

Projects support multiple pages:

- each page can store a solid background color from the Pages workspace
- page colors render consistently in the web editor, web preview, and Android preview
- add page
- select page
- rename page
- delete page
- mark a page as public, signed-in-only, or signed-out-only
- choose a redirect page for blocked sessions, with safe fallback when a redirect is missing or cyclic
- return a signed-in user to the private page they originally attempted to open
- define page-scoped text variables with stable IDs and initial preview values
- configure shared tap actions through a guided Behavior Builder for page navigation, hosted app-data submission, app-user accounts, page data, and safe external URLs

Page access is enforced during web and Android preview navigation. It is a runtime navigation guard, not a replacement for backend collection access policies or API authorization.

### Core Blocks

The current visible block palette is:

- Hero
- Text
- Button
- Badge
- Icon
- Shape
- Progress Bar
- Form
- Image
- Checkbox
- Toggle
- Container
- Collection List

Hero, Text, Button, Shape, and Image remain the main public-demo blocks. Badge, Icon, Progress Bar, Form, Checkbox, Toggle, Container, and Collection List are schema-backed primitives that are already available in the editor and runtime.

Text-like blocks support canvas editing and inspector editing. Text `value` and Hero `headline` can bind to page-scoped text variables or a field from the latest public record, one creator-selected public record, or the signed-in generated-app user's newest owned record while keeping their static props as fallbacks. Shape supports canvas placement/resizing and inspector-based visual styling. Button supports a static/no-action mode, page navigation, repeatable data submission, signed-in-user create-or-update/delete, generated-app signup/login/logout, safe external URLs, or page-variable updates plus inspector-based styling for colors, padding, and corner radius. The Inspector presents those behaviors in plain language, summarizes the configured result, suggests suitable account fields, and guides collection mutations and Save Data setup through destination, input selection, collection mapping, and success feedback.
Badge, Icon, Progress Bar, Checkbox, and Toggle also expose inspector-driven styling/content controls and render in both web preview and Android preview.
Icon and Image can optionally execute Navigate, Open URL, or Set Page Variable actions in web and Android preview.
Image supports URL-based images and local file uploads through backend asset storage, with fit, focal-point, border, radius, and opacity controls in both web preview and Android preview. The saved block schema stores the resulting image URL in `props.src`.
Form is a schema-backed submission surface. In web preview it posts dynamic child-field data to the backend, and the Records tab in the dedicated Data workspace can review stored records for each saved Form source.
Text is display-only by default. The inspector can make it app-editable, choose single-line or multiline input, configure field metadata and appearance, and expose its live value through the block's stable ID.
Button configured with Save Data is a second schema-backed submission path. It persists the existing `submitData` schema action, so web and Android preview continue submitting the same-page editable Text, Checkbox, and Toggle fields explicitly selected in the Behavior Builder. Eligible inputs are selected automatically for a new Save Data behavior, collection targets are mapped when possible, and incomplete mappings are blocked from saving. Editable Text can also supply live values to Change Page Data actions.
Container supports grouping approved atomic child blocks, entering an explicit child-editing mode, dragging blocks into the container, dragging children back onto the page, and optional container surface styling.
Project-level data collections define stable record sources and typed fields. Submit Data buttons can map selected field values into a collection. Text and Hero can directly display a field from the latest public record, one public record selected by the app creator, or the signed-in generated-app user's newest owned record in web and Android preview.
Collection List repeats one creator-designed item across up to 20 collection records. The first milestone supports all-record or signed-in-user scope, newest/oldest ordering, configurable item spacing, and Text/Hero `currentItem` bindings in both web and Android preview.

### Grid Layout

Current layout capabilities:

- 16-column page grid
- fixed 29-row phone-style editor workspace
- grid-snapped placement
- grid-snapped resizing
- collision prevention
- bounded render metadata inside occupied grid cells
- optional content scaling behavior for supported core blocks

### Preview

- Web preview mode renders the active project page without editor controls.
- Android native preview can load backend projects and render the schema with Jetpack Compose.
- The editor's `Preview on Android` action currently explains local Android Studio setup; it does not launch a public APK or hosted mobile preview.

### Persistence

- Projects are saved to MongoDB through the backend.
- Project CRUD is available through authenticated API routes.
- Saved projects can review Contact Form, Form, and Submit Data button app-data sources from the dashboard, inspect stored records, and export source data as CSV.
- Hosted records use a mutable collection-oriented model with created/updated timestamps and optional generated-app-user ownership.
- The owner-only Records workspace identifies authenticated, anonymous, and deleted-user submissions without exposing raw ownership fields, password hashes, normalized emails, or session tokens. Submitter identity is resolved only inside the current project.
- Record browsing uses 50-record cursor pages with previous/next controls and accurate source totals, so the workspace does not download every submission into the browser.
- Collection access rules independently configure runtime create, read, update, and delete permissions. Authenticated generated-app users can list, update, and delete their own records through owner-scoped web and Android API clients.

### Deployment

- Frontend is deployed to Azure Static Web Apps.
- Backend is deployed to Azure App Service.
- CI/CD runs through GitHub Actions.

## Existing But Not Primary Public-Demo Blocks

These block types exist in the codebase:

- Services List
- Contact Form
- Image Gallery

They are not currently the preferred public-demo block direction. The better long-term direction is to rebuild complex business sections from smaller primitive blocks and templates.

## Planned Feature Areas

### More Atomic Blocks

Implemented primitives:

- Badge
- Icon
- Progress Bar
- Form
- Image
- Checkbox
- Toggle
- Shape

Still planned:

- Card

### Sections And Containers

The intended direction is:

```text
Page grid controls section/container placement.
Section/container controls child blocks internally.
```

This should allow users to resize or move a whole section while still editing the smaller blocks inside it.

### Templates

Templates insert useful groups of normal blocks instead of creating large, rigid one-off blocks.

Template architecture supports:

```text
Section template = one container plus child blocks on the current page
Page template    = one complete generated page
App template     = multiple generated pages with nav buttons wired together
```

The current visible catalog is intentionally limited to section templates: Hero CTA, Signup Form, Feature List, Checklist Card, and Contact Card. Page and app template scaffolding exists in code, but those catalogs are empty for now.

### Android Preview Improvements

Planned runtime work:

- tighter block-by-block parity with web preview
- better unsupported-block fallback UI
- continued testing of URL/uploaded image rendering across device sizes
- section/container rendering after the section model is stable

### Demo And Portfolio Polish

Current demo support:

- one-click reviewer entry without creating an account
- five-screen `FieldReady` workflow covering a signed-out welcome screen, operations dashboard, inspection checklist, live field-note binding, and completion summary
- polished use of portable atomic blocks, containers, navigation actions, page state, page access, page backgrounds, and a project collection schema
- editable in-memory sample project using the normal project schema and the same web and Android-compatible runtime contract
- clear temporary-mode messaging with persistence disabled
- backend-dependent account and hosted-submission actions are intentionally excluded because the temporary demo is not a persisted backend project

Planned demo improvements:

- screenshots/GIFs in README
- clearer limitation messaging
- smoother loading/error states

## Strategic Future Features

These are not current product features. They are long-term directions.

### Offline-First Apps

Future generated apps should eventually support:

- local database
- write queue
- delta sync
- conflict handling
- reliable low-connectivity behavior

### App Store Pipeline

Future platform work may include:

- build automation
- signing guidance
- metadata validation
- privacy-label guidance
- APK/AAB generation and later store submission support

### Code Export

Long-term export should aim for real ownership and portability:

- generated app code
- data schemas
- CI recipes
- self-hosting path

### Compliance-Oriented Generation

Future enterprise/compliance work could include:

- audit logs
- field-level encryption
- BYOK planning
- HIPAA/PHI modes
- MDM packaging considerations

These features should not be marketed as complete until implemented.

### Plugin SDK And Marketplace

A future plugin system could allow third-party components, connectors, and actions. This should wait until the core block/schema model is more stable.

### GenAI App Building

GenAI should generate or modify the existing project schema. It should not create a separate app format.

Good first AI features:

- rewrite block text
- suggest page structure
- generate a section from templates
- validate generated schema before applying changes

Later AI features:

- prompt-to-page
- prompt-to-app
- guided app iteration

## Current Known Feature Limits

- Templates are implemented as static editor-time recipes, not user-created or marketplace templates.
- Business blocks need a clearer long-term strategy.
- Android preview parity is improving but still needs systematic testing.
- Container editing is intentionally limited to one level; nested containers are not supported.
- Generated-app identity covers project-scoped signup/login/logout, ownership metadata, current-user display bindings, basic profile editing, and policy-enforced owner-scoped record APIs. Password recovery is not implemented.
- Dynamic bindings currently cover page-scoped text variables plus latest-record, creator-selected specific-record, and signed-in-user newest-owned-record collection fields for Text/Hero. Generic page parameters and app-state actions are not implemented.
- Page-variable values are runtime-only preview state. They reset when a page runtime is recreated and are not persisted as hosted app data.
- Project collections, public and owner-scoped reads, latest/specific/current-user Text/Hero bindings, ownership enforcement, and Button actions that create-or-update or delete the signed-in user's newest owned record are implemented. End-user-selected record mutation, relationships, and filtering are not.
- Export and app-store pipeline features are not implemented.
- GenAI generation is planned, not currently implemented.
