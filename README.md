# Apptura

Apptura is a low-code mobile app builder. Users design app screens in a web editor, save projects through a Node/Express backend, and preview saved projects in a Kotlin/Jetpack Compose Android runtime.

The current product focus is a stable public demo, a clean grid-based editor, and reliable parity between the web editor, web preview, and Android preview.

## Live Deployment

- Frontend: <https://delightful-desert-04350a50f.7.azurestaticapps.net>
- Backend: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net>
- Backend health check: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net/health>

## Current Features

- JWT signup/login and protected project APIs
- Project dashboard with create/open/delete flows
- Multi-page app projects
- Visual editor with pages, block palette, canvas, and inspector
- 16-column grid-based block placement and resizing
- Inline editing for core text-like blocks
- Lightweight primitive blocks: Shape, Badge, Icon, Progress Bar, Input, Textarea, Checkbox, and Toggle
- Nav Button supports page navigation plus inspector-based visual styling
- Input, Textarea, Checkbox, and Toggle are currently visual mockup blocks, not live form-submission fields
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
The current add-block palette is grouped into text/navigation, visual elements, and form-mockup primitives so new schema-backed blocks can land without introducing more one-off business sections.

## License

All rights reserved. See `LICENSE` for details.

## Author

Preston Willis

- GitHub: <https://github.com/pwilly1>
- Email: prwillis2@gmail.com
