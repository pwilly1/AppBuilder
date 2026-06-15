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
- page structure panel
- block palette
- central phone-style canvas
- right-side inspector
- editor toolbar for save, undo, redo, web preview, and Android preview setup note

### Pages

Projects support multiple pages:

- add page
- select page
- rename page
- delete page
- navigate between pages with nav button blocks in preview mode

### Core Blocks

The stable public-demo block set is:

- Hero
- Text
- Nav Button
- Shape

Text-like blocks support canvas editing and inspector editing. Shape supports canvas placement/resizing and inspector-based visual styling.

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

Planned primitives:

- Divider
- Spacer
- Card/container
- Improved button variants
- Input
- Textarea
- Image

### Sections And Containers

The intended direction is:

```text
Page grid controls section/container placement.
Section/container controls child blocks internally.
```

This should allow users to resize or move a whole section while still editing the smaller blocks inside it.

### Templates

Templates should insert useful groups of normal blocks instead of creating large, rigid one-off blocks.

Examples:

```text
Hero template = heading + text + button
Services template = heading + cards
Contact template = heading + inputs + button
```

### Android Preview Improvements

Planned runtime work:

- tighter block-by-block parity with web preview
- better unsupported-block fallback UI
- image block support after web image support exists
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

- Complex sections/containers are not fully implemented.
- Business blocks need a clearer long-term strategy.
- Android preview parity is improving but still needs systematic testing.
- App data storage for generated apps is not implemented.
- Export and app-store pipeline features are not implemented.
- GenAI generation is planned, not currently implemented.
