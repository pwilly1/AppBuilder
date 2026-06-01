# Apptura

Apptura is a low-code app creation platform that lets users visually design and configure mobile app content without writing extensive code.
It currently includes a React/Tailwind web editor, a Node.js/Express backend, and an Android Kotlin/Compose native preview app.

Live deployment:
- Frontend: <https://delightful-desert-04350a50f.7.azurestaticapps.net>
- Backend health check: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net/health>

---

## Features (Current)

- Visual app editor with draggable block placement and property inspector
- Grid-snapped block placement and resizing for core blocks
- Inline and inspector-based editing for hero, text, and navigation button blocks
- Multi-page project editing (add, rename, delete, select)
- Web preview pane and Android native runtime preview
- Authentication with JWT (signup/login, protected APIs)
- Project persistence in MongoDB (create, list, open, update, delete)
- Dashboard for project management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT |
| Hosting | Azure Static Web Apps, Azure App Service |
| CI/CD | GitHub Actions |
| Native Preview | Android (Kotlin + Jetpack Compose) |
| AI | Planned (not yet implemented in this repository) |

---

## Prerequisites

- Node.js (LTS recommended)
- npm or yarn
- MongoDB (local or Atlas)
- Android Studio + Android SDK (for native-preview app)

---

## How It Works (Current)

1. A user signs up or logs in.
2. The user creates/edits projects in the web editor.
3. Project schema is saved to MongoDB via Express APIs.
4. The Android native preview app can load and render saved projects.

Planned next layers include AI-assisted layout/content generation and deployment/export automation.

---

## Deployment

Current deployment architecture:

```text
Azure Static Web Apps frontend
  -> Azure App Service backend
  -> MongoDB Atlas database
```

The frontend build receives the backend URL through:

```text
VITE_API_URL
```

The backend allows the deployed frontend through:

```text
CORS_ORIGIN
```

See [docs/AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md) for deployment details and environment variables.

See [docs/ROADMAP.md](docs/ROADMAP.md) for completed milestones and planned next steps.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login and get JWT |
| GET | `/auth/createGuestSession` | Create guest session token |
| GET | `/auth/health` | Health check |
| GET | `/auth/me` | Get current authenticated user |
| GET | `/projects` | List current user projects |
| POST | `/projects` | Create new project |
| GET | `/projects/:id` | Get project by id (owner-only) |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project (owner-only) |

---

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add new feature"`
4. Push to your fork: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

Licensed under the MIT License.
See the `LICENSE` file for details.

---

## Author

**Preston Willis**
GitHub: <https://github.com/pwilly1>
Email: prwillis2@gmail.com
