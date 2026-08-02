# Apptura Shared Contracts

This package contains framework-free TypeScript contracts that must be interpreted consistently by more than one Apptura surface.

Current contents:

- the versioned AI generation capability catalog
- the `AppGenerationPlanV1` contract
- the strict parser for untrusted generation-plan JSON

The package must not depend on React, browser APIs, Express, MongoDB, environment variables, or Android code. Frontend UI and editor-state compilation remain in `frontend`; model credentials, provider calls, authenticated endpoints, limits, and persistence belong in `backend`.

Frontend and backend reference this directory through the local `@apptura/shared` dependency. Their normal build commands compile it automatically. To build it directly:

```powershell
npm install
npm run build
```

`dist` and `node_modules` are generated locally and are not committed.
