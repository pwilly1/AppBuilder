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

These endpoints only accept a `blockId` that identifies a `contactForm` block in the project.

Submission data can contain:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "phone": "555-0100",
  "message": "Please contact me."
}
```

At least one non-empty field is required. Successful submissions may trigger an email notification when email settings are configured.

### `GET /projects/:id/forms/:blockId/submissions`

Requires authentication and project ownership. Returns submissions for one contact-form block.

### `POST /projects/:id/forms/:blockId/submissions`

Requires authentication and project ownership. Guest users cannot submit through this route.

Success: `201` with the stored submission.

### `POST /public/projects/:id/forms/:blockId/submissions`

Does not require authentication. It exists so a rendered public project can submit its contact form.

Success: `201` with the stored submission.

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
