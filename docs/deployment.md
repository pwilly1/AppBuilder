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
app_location: app-builder/frontend
api_location: ""
output_location: dist
```

Required GitHub secret:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_DESERT_04350A50F
```

Required build-time environment variable:

```text
VITE_API_URL=https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net
```

Because the frontend is built by Vite, `VITE_API_URL` must be available during the GitHub Actions build. Adding it only as a runtime Azure Static Web Apps setting is not enough after the static files are already built.

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
3. builds TypeScript into `dist`
4. prunes dev dependencies
5. uploads the backend artifact
6. logs into Azure with OIDC
7. deploys to Azure App Service

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
```

`APP_USER_JWT_SECRET` should be a different long random value in production. The backend falls back to `JWT_SECRET` for compatibility, but generated-app tokens still use a distinct payload type and cannot be accepted as builder sessions.

Optional:

```text
RESEND_API_KEY=...
EMAIL_FROM=...
```

`CORS_ORIGIN` can contain comma-separated origins if more than one frontend URL needs access.

Image uploads require Azure Blob Storage configuration. The backend stores image bytes in the configured container and returns a URL for the Image block schema. The returned URL must be readable by web preview and Android preview. Use a public-read container, CDN/static website base URL, or another public asset base URL through `AZURE_STORAGE_PUBLIC_BASE_URL`.

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
