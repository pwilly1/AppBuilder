# Azure Deployment

This project is currently deployed with Azure-managed services rather than a virtual machine.

## Live URLs

- Frontend: <https://delightful-desert-04350a50f.7.azurestaticapps.net>
- Backend: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net>
- Backend health check: <https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net/health>

## Architecture

```text
GitHub Actions
  -> Azure Static Web Apps frontend
  -> Azure App Service backend
  -> MongoDB Atlas
```

The frontend and backend are deployed separately:

- the React/Vite frontend is deployed to Azure Static Web Apps
- the Node/Express backend is deployed to Azure App Service
- the database remains MongoDB Atlas

This keeps the project cloud-hosted without requiring manual VM/server administration.

## Frontend Deployment

Workflow:

```text
.github/workflows/azure-static-web-apps-delightful-desert-04350a50f.yml
```

Important settings:

```text
app_location: app-builder/frontend
api_location: ""
output_location: dist
```

The frontend needs this build-time variable:

```text
VITE_API_URL=https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net
```

Because this is a Vite app, `VITE_API_URL` must be present during the GitHub Actions build. Static runtime app settings alone are not enough after the app has already been built.

## Backend Deployment

Workflow:

```text
.github/workflows/deploy-backend.yml
```

Important settings:

```text
BACKEND_PATH=app-builder/backend
AZURE_WEBAPP_NAME=apptura
NODE_VERSION=22.x
```

The workflow:

1. installs backend dependencies
2. builds TypeScript into `dist`
3. prunes dev dependencies
4. uploads the backend artifact
5. logs into Azure with OIDC
6. deploys to Azure App Service

