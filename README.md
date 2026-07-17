# Apptura

Apptura is a low-code mobile app builder. Users design app screens in a web editor, save projects through a Node/Express backend, and preview saved projects in a Kotlin/Jetpack Compose Android runtime.

The current product focus is a stable public demo, a clean grid-based editor, and reliable parity between the web editor, web preview, and Android preview.

## Live Deployment

- Frontend: <https://delightful-desert-04350a50f.7.azurestaticapps.net>
- Backend: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net>
- Backend health check: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net/health>

## Current Features

- JWT signup/login and protected project APIs
- One-click interactive demo with a temporary schema-backed sample project
- Project dashboard with create/open/delete flows
- Multi-page app projects
- Per-page solid background colors with matching web and Android rendering
- Visual editor with tabbed workspace tools for pages, blocks, and data, plus a drag-aware block palette, canvas, and inspector
- 16-column grid-based block placement and resizing
- Inline editing for core text-like blocks
- Page-scoped text variables can drive Text and Hero content through schema-backed bindings in web and Android preview
- Button, Icon, and Image actions can update page-scoped text variables from fixed values or live Input/Textarea values in web and Android preview
- Lightweight primitive blocks: Button, Shape, Badge, Icon, Image, Progress Bar, Form, Input, Textarea, Checkbox, Toggle, Container, and Data List
- Button supports no action, page navigation, hosted-data submission, safe external URLs, or page-variable updates through the shared block-action contract
- Icon and Image can optionally run shared Navigate, Open URL, or Set Page Variable actions in web and Android preview
- Image supports pasted URLs and uploaded files stored through backend asset storage, with fit, focal-point, border, radius, and opacity controls
- Form blocks can collect live app-user submissions in web preview using nested Input, Textarea, Checkbox, and Toggle field blocks
- Buttons configured with Submit Data explicitly select which same-page Input, Textarea, Checkbox, and Toggle fields they submit, either to their own source or to a selected project collection
- Input, Textarea, Checkbox, and Toggle can act as live fields in web preview when nested inside a Form block or selected by a Submit Data button; otherwise they remain editor-time mockup controls
- Project-level data collections define stable typed record sources with optional public-read access for runtime list blocks
- Data List blocks can display records from a publicly readable collection in web and Android preview
- Container blocks can group supported atomic child blocks including Image, expose container styling in the inspector, and render in both web and Android preview
- Dashboard project cards include an App Data drawer for reviewing collection, Contact Form, Form, and Submit Data button sources, their saved records, and CSV exports
- Web preview mode with page navigation
- Android native preview runtime connected to backend project data
- Editor toolbar note for Android preview setup while public APK/app-store distribution is pending
- MongoDB persistence for projects
- Azure-hosted frontend and backend with GitHub Actions deployment

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Editor interactions | React state, custom grid math, dnd-kit dependency available |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT |
| Native preview | Android, Kotlin, Jetpack Compose |
| Hosting | Azure Static Web Apps, Azure App Service |
| CI/CD | GitHub Actions |

## Repository Layout

```text
app-builder/
  frontend/          React/Vite web app and editor
  backend/           Express API, auth, project persistence
  native-preview/    Android/Kotlin native preview app
docs/                Architecture, deployment, features, roadmap, project history
.github/workflows/   Frontend and backend deployment workflows
```

## Documentation

- [Architecture](docs/architecture.md) - system design, editor/runtime schema, frontend/backend/native structure
- [Deployment](docs/deployment.md) - Azure hosting, GitHub Actions, production configuration
- [API Reference](docs/api-reference.md) - backend routes, authentication, payloads, and response behavior
- [Block and Schema Reference](docs/block-reference.md) - project schema, grid contract, block inventory, and migration behavior
- [Container and Template System](docs/container-template-system.md) - current container/template design and implementation direction
- [Dynamic Data Binding](docs/dynamic-data-binding.md) - approved architecture for page data, runtime values, bindings, and future generated-app users
- [How to Add a Block](docs/how-to-add-a-block.md) - end-to-end web and Android block implementation workflow
- [Features](docs/features.md) - current capabilities, planned product areas, known feature limits
- [Roadmap](docs/roadmap.md) - priorities, milestones, and next work
- [Project History](docs/project-history.md) - summarized evolution of the project
- [Agent Notes](docs/AGENTS.md) - context for Codex/AI agents continuing work

## Current Direction

The editor is moving toward a shared runtime contract:

```text
layout.grid = where a block is allowed to live
render = how the block is positioned/sized inside that grid area
props = block-specific content and styling
```

The long-term goal is for the same saved schema to power web preview, Android preview, future export targets, and eventual AI-assisted generation.

Today the editor canvas is intentionally constrained to a phone-style 16-column by 29-row workspace so placement stays predictable and closer to the Android reference surface.
The current editor keeps page structure, block insertion, and runtime data setup in a tabbed left workspace so the rail stays focused while preserving the same three-column shell.
Inside the Blocks tab, the add-block palette is grouped into text/navigation, visual elements, forms/fields, and layout blocks so new schema-backed blocks can land without introducing more one-off business sections.

## License

All rights reserved. See `LICENSE` for details.

## Author

Preston Willis

- GitHub: <https://github.com/pwilly1>
- Email: prwillis2@gmail.com
