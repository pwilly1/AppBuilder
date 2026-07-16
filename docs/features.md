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
- page-variable and collection tools inside the Data tab
- central phone-style canvas
- right-side inspector
- editor toolbar for save, undo, redo, web preview, Android preview setup note, and active-container exit
- sticky left workspace rail on desktop with independent scrolling for long block/data lists
- drag-to-place block palette with click-to-add still available

### Pages

Projects support multiple pages:

- add page
- select page
- rename page
- delete page
- define page-scoped text variables with stable IDs and initial preview values
- configure shared tap actions for page navigation, hosted app-data submission, and safe external URLs

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
- Input
- Textarea
- Image
- Checkbox
- Toggle
- Container
- Data List

Hero, Text, Button, Shape, and Image remain the main public-demo blocks. Badge, Icon, Progress Bar, Form, Input, Textarea, Checkbox, Toggle, and Container are lightweight schema-backed primitives that are already available in the editor and runtime.

Text-like blocks support canvas editing and inspector editing. Text `value` and Hero `headline` can also bind to page-scoped text variables while keeping their static props as fallbacks. Shape supports canvas placement/resizing and inspector-based visual styling. Button supports a static/no-action mode, page navigation, data submission, safe external URLs, or page-variable updates plus inspector-based styling for colors, padding, and corner radius.
Badge, Icon, Progress Bar, Checkbox, and Toggle also expose inspector-driven styling/content controls and render in both web preview and Android preview.
Icon and Image can optionally execute Navigate, Open URL, or Set Page Variable actions in web and Android preview.
Image supports URL-based images and local file uploads through backend asset storage, with fit, focal-point, border, radius, and opacity controls in both web preview and Android preview. The saved block schema stores the resulting image URL in `props.src`.
Form is a schema-backed submission surface. In web preview it posts dynamic child-field data to the backend, and the dashboard can review stored records for each saved Form source.
Button configured with Submit Data is a second schema-backed submission path. In web preview it submits the same-page Input, Textarea, Checkbox, and Toggle fields explicitly selected in the button inspector.
Input and Textarea can also supply live values to Set Page Variable actions through stable block IDs. Input, Textarea, Checkbox, and Toggle can act as live submission fields when nested inside a Form block or selected by a Submit Data button. In web and Android preview, these controls collect runtime values and the button posts only its selected fields to the hosted app-data API. In the editor they still behave as mockup controls.
Container supports grouping approved atomic child blocks, entering an explicit child-editing mode, dragging blocks into the container, dragging children back onto the page, and optional container surface styling.
Project-level data collections define stable record sources and typed fields. Submit Data buttons can map selected field values into a collection, and Data List can display that collection in web and Android preview when public reads are enabled.

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
- Input
- Textarea
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

Planned demo improvements:

- sample project
- easier reviewer entry
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
- Dynamic bindings currently cover page-scoped text variables only. Page parameters, page-owned collection-record sources, app-state actions, and generated-app user bindings are not implemented.
- Page-variable values are runtime-only preview state. They reset when a page runtime is recreated and are not persisted as hosted app data.
- Project collections and read-only collection lists are implemented, but record detail, update/delete actions, relationships, filtering, and generated-app user ownership are not.
- Export and app-store pipeline features are not implemented.
- GenAI generation is planned, not currently implemented.
