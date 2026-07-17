# Roadmap

This roadmap tracks completed foundations, current priorities, and future work.

## Status Key

| Status | Meaning |
| --- | --- |
| Completed | Built and usable in the current project |
| In Progress | Partially built or actively being stabilized |
| Planned | Important future work after current priorities |
| Later | Strategic work that should wait for a stronger foundation |

## Completed Foundations

| Status | Area | Notes |
| --- | --- | --- |
| Completed | Repository foundation | Frontend, backend, native-preview folders, license, and documentation structure exist. |
| Completed | Authentication | Signup, login, JWT sessions, guest/session support, protected routes. |
| Completed | Project persistence | MongoDB-backed project create, list, open, update, delete. |
| Completed | Image asset upload path | Saved projects can upload image files through the backend and store returned asset URLs in schema. |
| Completed | Dashboard | Users can manage projects from the dashboard. |
| Completed | Multi-page projects | Pages can be created, selected, renamed, deleted, and navigated. |
| Completed | Basic editor shell | Three-column editor with left panel, canvas, inspector, and toolbar. |
| Completed | Grid-based layout model | Canonical placement uses `layout.grid`; render metadata uses `render`. |
| Completed | Web preview | Preview mode renders project pages without editor controls. |
| Completed | Android preview foundation | Kotlin/Compose app can load backend projects and render schema data. |
| Completed | Shared action foundation | Button, Icon, and Image consume applicable schema-backed Navigate, Submit Data, Open URL, and Set Page Variable actions across web and Android. |
| Completed | Azure deployment | Frontend and backend are deployed with GitHub Actions. |

## Current Priorities

### 1. Public Demo Quality

Goal: make the deployed app easy to understand and safe to show.

| Status | Task |
| --- | --- |
| In Progress | Polish dashboard and editor presentation. |
| In Progress | Keep public block palette focused on stable core blocks. |
| Completed | Add a clean sample/demo project with one-click reviewer entry. |
| Planned | Add screenshots or GIFs to README/portfolio material. |
| Planned | Add clearer loading and error states. |
| Planned | Add concise current-limitations messaging. |

### 2. Editor Stability

Goal: make Hero, Text, Button, and Shape behavior dependable before expanding block complexity.

| Status | Task |
| --- | --- |
| Completed | Stabilize core add/move/resize/edit flows. |
| Completed | Add box-only vs scale-content resize behavior for supported blocks. |
| In Progress | Continue reducing inline-editing visual differences. |
| In Progress | Keep grid snapping exact and predictable. |
| Planned | Add stronger manual regression checklist. |
| Completed | Add focused automated tests around runtime bindings, actions, schema migration, grid helpers, and container hierarchy. |

### 3. Android/Web Runtime Parity

Goal: projects should look and behave consistently across web preview and Android preview.

| Status | Task |
| --- | --- |
| Completed | Add Android schema support for grid layout and render metadata. |
| Completed | Add Android content-scale helper for schema parity. |
| In Progress | Tune typography, wrapping, and block sizing differences. |
| Planned | Add unsupported-block fallback UI on Android. |
| Planned | Test the same saved projects across web and Android. |

### 4. Documentation And Portfolio Polish

Goal: make the repo understandable to recruiters, collaborators, and future you.

| Status | Task |
| --- | --- |
| Completed | Add live deployment links. |
| Completed | Reorganize docs by purpose. |
| Planned | Add architecture diagram/screenshot. |
| Planned | Add CI/CD badge. |
| Planned | Add a short portfolio summary section. |

## Next Product Build-Out

### 5. Atomic Blocks

Goal: add simple reusable primitives before complex sections.

Recommended order:

| Status | Block |
| --- | --- |
| Completed | Shape |
| Completed | Badge |
| Completed | Icon |
| Completed | Progress Bar |
| Completed | Form |
| Completed | Input |
| Completed | Textarea |
| Completed | Checkbox |
| Completed | Toggle |
| Completed | Image |
| In Progress | Container |

### 6. Section / Container System

Goal: support more complex layouts without making every feature a giant block.

Target direction:

```text
Page grid controls container placement.
Container controls child blocks internally.
```

Tasks:

| Status | Task |
| --- | --- |
| Completed | Write section/container schema design draft. |
| Completed | Add basic container block. |
| Completed | Support child blocks inside a container. |
| Completed | Support moving/resizing a whole container. |
| Completed | Support selecting/editing child blocks. |
| Completed | Add Android rendering for container hierarchy. |
| In Progress | Stabilize container UX, regression coverage, and template handoff points. |

### 7. Templates

Goal: let users add useful app sections quickly using normal blocks.

| Status | Task |
| --- | --- |
| Completed | Template picker UI that can group section, page, and app templates. |
| Completed | Section template insertion logic. |
| Completed | Page template scaffolding and insertion path. |
| Completed | App template scaffolding and insertion path with generated page IDs and nav wiring. |
| Completed | Hero, form, feature, checklist, and contact section templates. |
| Planned | Full page template catalog. |
| Planned | Full app template catalog. |
| Planned | Template drag-to-place preview for section templates. |
| Planned | Template thumbnails/live previews. |
| Planned | Broader vertical template catalog. |
| Later | User-created templates and marketplace/distribution model. |

## Strategic Future Roadmap

These are important to the long-term product vision but should wait until the editor/runtime foundation is stronger.

### 8. User App Data Storage

| Status | Task |
| --- | --- |
| Completed | Schema-backed form and grouped submit-button records tied to project schema. |
| Completed | Apptura-hosted app-data source listing, record viewing, CSV export, and web/Android submission. |
| Completed | App-level data collections with typed field definitions and stable IDs. |
| Later | Richer app-level relational data collections. |
| Completed | Read-only Data List block across web and Android. |
| Completed | Page-scoped text variables and Text/Hero bindings with matching web/Android resolution and editor sample values. |
| Completed | Schema-backed Set Page Variable actions on Button, Icon, and Image across web and Android. |
| Completed | Input/Textarea runtime values as stable-ID sources for Set Page Variable actions. |
| Planned | Page parameters and app-state actions. |
| Planned | Page-owned collection-record data sources and loading/error states. |
| Later | Data-bound record detail and update/delete blocks. |
| Later | Generated app user accounts. |
| In Progress | Access rules; collection public-read control exists, broader ownership rules remain. |

Implementation must follow [Dynamic Data Binding Architecture](dynamic-data-binding.md): pages resolve named data once, blocks bind to that context, and current-user bindings wait for generated-app identity and authorization.

### 9. Offline-First Runtime

| Status | Task |
| --- | --- |
| Later | Local app database. |
| Later | Write queue. |
| Later | Conflict handling strategy. |
| Later | Delta sync. |
| Later | Offline-capable templates such as inspections or delivery checklists. |

### 10. Export And Build Pipeline

| Status | Task |
| --- | --- |
| Later | Android project generation. |
| Later | Asset bundling. |
| Later | App name/icon/package configuration. |
| Later | Gradle build automation. |
| Later | APK/AAB output. |
| Later | React Native or Flutter export research. |

### 11. App Store Pipeline

| Status | Task |
| --- | --- |
| Later | App metadata management. |
| Later | Screenshots/icons pipeline. |
| Later | Signing key management. |
| Later | Play Store upload flow. |
| Later | Apple App Store planning. |
| Later | Privacy-label guidance. |

### 12. GenAI App-Building Layer

Goal: use AI to assist app creation without bypassing the editor schema.

| Status | Task |
| --- | --- |
| Later | AI copywriting for hero/text/button labels. |
| Later | Prompt-to-section using existing templates. |
| Later | Prompt-to-page generation. |
| Later | Prompt-to-app starter flow. |
| Later | Schema validation for AI-generated layouts. |
| Later | Preview-and-confirm before saving AI changes. |

Rule:

```text
AI should be an assistant over the schema, not a replacement for the editor.
```

### 13. Plugin SDK / Marketplace

| Status | Task |
| --- | --- |
| Later | Define plugin manifest. |
| Later | Component/plugin SDK. |
| Later | Connector/action SDK. |
| Later | Marketplace/revenue-share model. |

### 14. Compliance-Oriented Generation

| Status | Task |
| --- | --- |
| Later | Audit logs. |
| Later | Field-level encryption planning. |
| Later | BYOK research. |
| Later | HIPAA/PHI mode research. |
| Later | MDM packaging research. |

## Near-Term Recommendation

The best next sequence is:

```text
1. Finish public demo polish.
2. Keep core editor blocks stable.
3. Stabilize the new container primitive and hierarchy rules.
4. QA section/page/app templates across save, reload, undo, redo, and Android preview.
5. Improve Android parity after each schema change.
6. Add screenshots/demo material.
```

Avoid jumping into export, app-store automation, compliance, or marketplace work until the builder primitives and runtime contract are stable.
