# API Reference

This document describes the HTTP API currently exposed by the Apptura backend. The implementation lives under `app-builder/backend/src`.

## Base URLs

Local development:

```text
http://localhost:3000
```

Production:

```text
https://apptura-cneyenbkczh5hzcv.eastus-01.azurewebsites.net
```

The frontend uses relative paths locally through the Vite proxy. Hosted builds use the build-time `VITE_API_URL` value.

## Authentication

Protected endpoints require a JWT in the request header:

```http
Authorization: Bearer <token>
```

Missing, invalid, and expired tokens return `401`. Tokens expire according to `JWT_EXPIRES_IN`, which defaults to `1h`.

Guest tokens are valid authentication tokens, but guest users cannot create projects, save projects, upload project images, or submit authenticated forms.

## Health Endpoints

### `GET /health`

Returns the main backend health response.

```json
{ "ok": true }
```

### `GET /auth/health`

Returns the same health shape. The Android preview currently uses this route.

## Authentication Endpoints

### `POST /auth/signup`

Creates a user and returns a JWT.

Request:

```json
{
  "username": "example-user",
  "email": "user@example.com",
  "password": "example-password"
}
```

Success: `201`

```json
{ "token": "<jwt>" }
```

Common failure: `400` with `{ "error": "..." }`.

### `POST /auth/login`

Authenticates an existing user.

Request:

```json
{
  "username": "example-user",
  "password": "example-password"
}
```

Success: `200` with `{ "token": "<jwt>" }`.

Invalid credentials return `401`.

### `GET /auth/createGuestSession`

Creates a temporary guest user record and returns a guest JWT.

Success: `200` with `{ "token": "<jwt>" }`.

### `GET /auth/me`

Requires authentication. Returns the authenticated user attached by the auth middleware.

```json
{ "user": { "...": "stored user fields" } }
```

## Project Endpoints

All `/projects` routes require authentication and enforce project ownership when loading a specific project.

### `GET /projects`

Lists projects owned by the authenticated user, sorted by most recently updated.

Success: `200` with an array of projects.

### `POST /projects`

Creates a project for the authenticated user.

Request:

```json
{ "name": "My App" }
```

If `name` is omitted, the backend uses `Untitled Project`.

Success: `201` with the created project. Guest users receive `403`.

### `GET /projects/:id`

Returns one project owned by the authenticated user.

Success: `200`. Missing projects and projects owned by another user return `404`.

### `PATCH /projects/:id`

Merges the supplied object into the stored project and returns the updated project.

Typical editor request:

```json
{
  "name": "Updated App",
  "schemaVersion": 3,
  "pages": []
}
```

Guest users receive `403`.

Current limitation: this route does not yet enforce a strict request schema or field allowlist. Clients should send only project fields they intend to update.

### `POST /projects/:id/assets/images`

Uploads one image asset for a saved project. This endpoint requires authentication and project ownership.

Request:

- `multipart/form-data`
- file field name: `file`

Success: `201`

```json
{
  "url": "https://cdn.example.com/projects/<projectId>/images/<uuid>.png",
  "blobName": "projects/<projectId>/images/<uuid>.png",
  "contentType": "image/png",
  "size": 12345,
  "fileName": "example.png"
}
```

Behavior notes:

- Guest users receive `403`.
- Missing files return `400`.
- Files larger than 5 MB return `400`.
- Supported content types are `image/jpeg`, `image/png`, `image/webp`, `image/gif`, and `image/svg+xml`.
- If Azure asset storage is not configured, the backend returns `503` with `{ "error": "Image uploads are not configured for this environment." }`.
- The returned `url` is what the editor stores in the Image block `props.src` field.

### `DELETE /projects/:id`

Deletes a project owned by the authenticated user.

Success: `204` with no response body.

## Form Submission Endpoints

These endpoints support two submission models:

- legacy `contactForm` blocks, which store the older fixed `name` / `email` / `phone` / `message` payload and can trigger email notifications
- schema-backed `form` blocks, which store dynamic field data collected from child `input`, `textarea`, `checkbox`, and `toggle` blocks
- schema-backed `button` blocks with `action.type = "submitData"`, which store dynamic field data from the same-page `input`, `textarea`, `checkbox`, and `toggle` blocks listed in `action.fields`

Legacy `contactForm` submission data can contain:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "phone": "555-0100",
  "message": "Please contact me."
}
```

Schema-backed `form` and Submit Data button submissions accept JSON keyed by each field's `fieldKey`. If `fieldKey` is blank, the backend derives a slug from the field label and also accepts the raw child `blockId` as a fallback key.

Example dynamic payload:

```json
{
  "full_name": "Example User",
  "email": "user@example.com",
  "project_summary": "Need a scheduling app.",
  "agree_to_terms": true
}
```

For Submit Data buttons, the backend resolves each stable `fieldBlockId` in `action.fields`. Optional `targetFieldKey` values map selected fields into a project collection.

At least one populated field is required. Required text fields must be non-empty, and required checkbox/toggle fields must be `true`. Successful legacy `contactForm` submissions may trigger an email notification when email settings are configured.

### `GET /projects/:id/forms/:blockId/submissions`

Requires authentication and project ownership. Returns submissions for one `contactForm`, `form`, or Submit Data `button` block.

### `POST /projects/:id/forms/:blockId/submissions`

Requires authentication and project ownership. Guest users cannot submit through this route.

Success: `201` with the stored submission.

### `POST /public/projects/:id/forms/:blockId/submissions`

Does not require authentication. It exists so a rendered public project can submit its `contactForm`, schema-backed `form`, or Submit Data `button` source in preview/runtime surfaces.

Success: `201` with the stored submission.

## App Data Source Endpoints

These routes expose the broader app-data source model used by the dashboard and frontend runtime. A source can be a project collection, legacy `contactForm`, schema-backed `form`, or Submit Data `button`. Buttons targeting collections are represented by the stable collection source instead of creating a duplicate source entry.

### `GET /projects/:id/app-data/sources`

Requires authentication and project ownership. Returns every app-data source in the project with its source id, block id, type, display name, page metadata, normalized field definitions, and record count.

### `GET /projects/:id/app-data/sources/:sourceId/records`

Requires authentication and project ownership. Returns stored records for one app-data source, newest first.

### `GET /projects/:id/app-data/sources/:sourceId/records.csv`

Requires authentication and project ownership. Returns the same source records as CSV and sets `Content-Disposition` to a generated `<project>-<source>-records.csv` filename.

### `POST /public/projects/:id/app-data/sources/:sourceId/records`

Does not require authentication. This is the canonical public runtime endpoint used by the current web preview for schema-backed app-data submission.

For `contactForm` sources it preserves the older fixed payload and email-notification behavior. For `form` and Submit Data `button` sources it validates the dynamic field set discovered from the saved schema and stores the record through `AppSubmission`.

Success: `201` with the stored record.

### `GET /public/projects/:id/app-data/collections/:collectionId/records`

Does not require authentication. Returns up to 100 collection records, newest first, only when that collection has `publicRead` enabled. This is the read endpoint used by Data List blocks in web and Android runtime. Returns `403` when public reads are disabled.

## Project Data Shape

The backend intentionally stores page and block data as flexible objects so the frontend schema can evolve without a matching Mongoose migration for every block prop.

The canonical TypeScript schema is documented in [Block and Schema Reference](block-reference.md). Architecture and persistence trade-offs are described in [Architecture](architecture.md).

## Error Shape

Handled application errors generally use:

```json
{ "error": "Human-readable message" }
```

The frontend request helper reads this field and throws an `Error`. A `401` also clears the locally stored frontend token.

## Related

- [Deployment](deployment.md)
- [Architecture](architecture.md)
