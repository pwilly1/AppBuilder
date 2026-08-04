# Deployment

Apptura is deployed with Azure-managed services rather than a virtual machine.

## Live URLs

- Frontend: <https://delightful-desert-04350a50f.7.azurestaticapps.net>
- Backend: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net>
- Backend health check: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net/health>

## Hosting Architecture

```text
GitHub repository
  -> GitHub Actions
  -> Azure Static Web Apps frontend
  -> Azure App Service backend
  -> MongoDB Atlas
```

The frontend and backend deploy separately:

- React/Vite frontend: Azure Static Web Apps
- Node/Express backend: Azure App Service
- Database: MongoDB Atlas

This avoids manual VM/server management while still showing a real cloud deployment path.

## Frontend Deployment

Workflow file:

```text
.github/workflows/azure-static-web-apps-delightful-desert-04350a50f.yml
```

Important workflow settings:

```text
app_location: app-builder/frontend/dist
api_location: ""
output_location: ""
skip_app_build: true
```

Required GitHub secret:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_DESERT_04350A50F
```

Required build-time environment variable:

```text
VITE_API_URL=https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net
```

The workflow installs frontend dependencies, compiles `app-builder/shared`, builds the Vite frontend with `VITE_API_URL`, and then uploads the prebuilt `frontend/dist` directory. `skip_app_build: true` prevents Azure's deploy action from rebuilding the app without the repository-relative shared package available. Adding `VITE_API_URL` only as a runtime Azure Static Web Apps setting is not enough after the static files are already built.

## Backend Deployment

Workflow file:

```text
.github/workflows/deploy-backend.yml
```

Important workflow settings:

```text
AZURE_WEBAPP_NAME=apptura
BACKEND_PATH=app-builder/backend
NODE_VERSION=22.x
```

Required GitHub secrets for Azure OIDC login:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

The backend workflow:

1. checks out the repo
2. installs backend dependencies with `npm ci`
3. compiles `app-builder/shared` and then builds backend TypeScript into `dist`
4. prunes dev dependencies
5. replaces the local shared-package link with a physical compiled package inside `node_modules/@apptura/shared`
6. uploads the self-contained backend artifact
7. logs into Azure with OIDC
8. deploys to Azure App Service

Changes under `app-builder/shared` trigger the backend workflow because future backend runtime code may consume those contracts. The shared package does not require another Azure resource; its compiled files are bundled into the frontend build and backend artifact.

## Backend App Settings

Configure these in Azure App Service application settings:

```text
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
APP_USER_JWT_SECRET=...
APP_USER_JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://delightful-desert-04350a50f.7.azurestaticapps.net
PORT=8080 or Azure-provided port behavior
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=apptura-assets
AZURE_STORAGE_PUBLIC_BASE_URL=https://...
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-terra
AI_REQUEST_TIMEOUT_MS=60000
AI_GENERATION_REQUESTS_PER_HOUR=20
AI_USAGE_SUMMARY_DAYS=30
```

`APP_USER_JWT_SECRET` should be a different long random value in production. The backend falls back to `JWT_SECRET` for compatibility, but generated-app tokens still use a distinct payload type and cannot be accepted as builder sessions.

Optional:

```text
RESEND_API_KEY=...
EMAIL_FROM=...
```

`CORS_ORIGIN` can contain comma-separated origins if more than one frontend URL needs access.

Image uploads require Azure Blob Storage configuration. The backend stores image bytes in the configured container and returns a URL for the Image block schema. The returned URL must be readable by web preview and Android preview. Use a public-read container, CDN/static website base URL, or another public asset base URL through `AZURE_STORAGE_PUBLIC_BASE_URL`.

The OpenAI key must be a project-scoped service-account key stored only in Azure App Service settings. Do not add it to the frontend Static Web App, a `VITE_` variable, GitHub source, or deployment logs. Use `AI_PROVIDER=fake` only when intentionally deploying the deterministic test provider.

`AI_GENERATION_REQUESTS_PER_HOUR` is an account-wide generation ceiling enforced through MongoDB, so it remains effective across backend restarts and multiple instances. `AI_USAGE_SUMMARY_DAYS` controls the reporting window returned by the usage endpoint. Both settings are optional and default to `20` requests per hour and `30` days.

## CORS Relationship

The deployed frontend must call the deployed backend:

```text
frontend origin -> backend CORS_ORIGIN allowlist
```

If `VITE_API_URL` is missing or wrong, the frontend may call its own Static Web Apps URL and fail with `405 Method Not Allowed` for API routes.

If `CORS_ORIGIN` is missing or wrong, browser requests may fail before reaching the real route handler.

## Pull Requests And Preview Deployments

The Static Web Apps workflow also runs for pull requests. The close-PR job uses the same Static Web Apps deployment token to clean up preview environments.

If close jobs fail with `No matching static site found`, but the main push deployment succeeds, it usually means the preview cleanup event could not match the expected Static Web Apps preview environment. Treat the successful `main` deployment as the source of truth unless the actual live site is broken.

## Deployment Verification

After backend deployment:

```text
https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net/health
```

Expected response:

```json
{ "ok": true }
```

After frontend deployment:

1. open the Static Web Apps URL
2. sign up or log in
3. create/open a project
4. save a change
5. refresh and confirm the project reloads

## Deployment Notes

- The frontend and backend are separate Azure resources.
- The backend must be deployed before hosted frontend login/project APIs can work.
- MongoDB Atlas network access must allow the backend to connect.
- GitHub Actions secrets are not the same as app environment variables.
- Do not commit `.env` files.
