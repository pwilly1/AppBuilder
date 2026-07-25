# Dynamic Data Binding

## Purpose

Dynamic binding lets a block display runtime data without replacing its saved design-time content. It is the presentation half of Apptura's data system:

- actions change or submit values
- bindings read values and display them
- static block props remain the visual fallback

The implementation intentionally starts small. Text `value` and Hero `headline` can currently read a page variable or a collection field from the latest public record, one creator-selected public record, or the signed-in generated-app user's newest owned record. The same saved schema is resolved by web preview and Android preview.

## Current Status

Implemented:

- page-scoped text variables
- `setPageState` actions with static or editable-Text values
- direct Text/Hero bindings to project collections
- latest-record, creator-selected specific-record, and signed-in-user newest-record selection
- page-level collection request deduplication
- loading, empty, missing, permission, and error fallback to static content
- matching web and Android schema/runtime behavior
- collection create/read/update/delete access rules
- generated-app owner-scoped record list/update/delete APIs with web and Android clients
- Button actions that update or confirm deletion of the signed-in user's newest owned record

Not implemented:

- end-user-selected records and record selection passed through navigation
- filters, sorting, or arbitrary collection queries
- arbitrary end-user-selected record update/delete actions
- formulas, conditional visibility, or a general expression language

## Core Rules

1. `props` store the block's normal static content and appearance.
2. `bindings` optionally replace individual prop values at runtime.
3. `actions` represent events and side effects; they are not bindings.
4. Bindings use stable IDs instead of labels or display names.
5. A page runtime loads shared data once; individual blocks do not fetch records.
6. Static props remain usable when runtime data cannot be resolved.
7. Every persisted binding source must behave consistently in web and Android.

## Saved Schema

### Runtime value references

```ts
type RuntimeValueRef =
  | { source: 'static'; value: string }
  | { source: 'pageState'; variableId: string; fallback?: string }
  | {
      source: 'collection'
      collectionId: string
      fieldId: string
      record?:
        | { mode: 'latest' }
        | { mode: 'currentUser' }
        | { mode: 'specific'; recordId: string }
      fallback?: string
    }
  | { source: 'formValue'; fieldBlockId: string; fallback?: string }
```

The sources have distinct responsibilities:

- `static` stores a fixed action value.
- `pageState` reads a page-scoped runtime variable.
- `collection` reads a field from the latest public record, one creator-selected public record, or the signed-in generated-app user's newest owned record.
- `formValue` reads a live editable-Text value for an action.

`formValue` is currently an action-value source, not a display binding exposed for Text/Hero.

### Block property bindings

```ts
type BlockBindings = Record<string, RuntimeValueRef>

type Block = {
  id: string
  type: BlockType
  props: Record<string, unknown>
  bindings?: BlockBindings
}
```

Example Text block:

```json
{
  "id": "welcome-text",
  "type": "text",
  "props": {
    "value": "No recent updates",
    "fontSize": 18
  },
  "bindings": {
    "value": {
      "source": "collection",
      "collectionId": "updates",
      "fieldId": "update-title",
      "record": { "mode": "latest" }
    }
  }
}
```

The runtime may replace `props.value`, but it never mutates the saved prop. If collection data is unavailable, the block still displays `No recent updates`.

### Page variables

```ts
type PageStateVariable = {
  id: string
  name: string
  type: 'text'
  initialValue: string
}
```

Page variables are local runtime state. They reset when the page runtime is recreated and are not records in hosted app data.

### Project collections

```ts
type AppDataCollection = {
  id: string
  name: string
  publicRead: boolean
  access?: {
    create: 'anyone' | 'authenticated'
    read: 'public' | 'own' | 'none'
    update: 'own' | 'none'
    delete: 'own' | 'none'
  }
  fields: Array<{
    id: string
    key: string
    label: string
    type: 'text' | 'number' | 'boolean' | 'email' | 'date'
    required?: boolean
  }>
}
```

`publicRead` remains as a compatibility mirror for older projects and runtime checks. Collections without `access` preserve legacy behavior: anonymous creation is allowed, `publicRead` controls anonymous reads, and runtime update/delete access is disabled.

Bindings save `collection.id` and `field.id`. Stored records use each field's `key`, so the runtime maps record keys back to stable field IDs before resolving block properties.

## Runtime Context

The page owns runtime data shared by its blocks:

```ts
type RuntimeContext = {
  pageState: Record<string, string>
  collectionData: Record<string, RuntimeDataState>
}

type RuntimeDataState =
  | { status: 'loading' }
  | { status: 'ready'; recordId: string; values: Record<string, string> }
  | { status: 'empty' }
  | { status: 'error'; message: string }
```

The lifecycle is:

```text
Open page
  -> initialize page variables
  -> scan block bindings for collection IDs
  -> deduplicate collection-and-selector requests
  -> request each latest, specific, or current-user record once
  -> map record keys to stable field IDs
  -> expose collection states in RuntimeContext
  -> resolve each block property
```

This design prevents ten blocks bound to one collection from making ten network requests. The blocks are pure consumers of the page context.

## Record Selection

The app creator chooses one of three selectors in the Inspector:

```text
selected collection -> latest submitted record -> selected field
selected collection -> specific saved record -> selected field
selected collection -> signed-in user's newest owned record -> selected field
```

Web and Android call:

```text
GET /public/projects/:projectId/app-data/collections/:collectionId/records/latest
GET /public/projects/:projectId/app-data/collections/:collectionId/records/:recordId
GET /public/projects/:projectId/app-data/collections/:collectionId/records/mine
```

The latest endpoint returns:

- the newest record when one exists
- JSON `null` for an empty collection
- `403` when `publicRead` is disabled
- `404` when the project or collection does not exist

The specific-record endpoint returns the selected record or `404` when it no longer exists in that project and collection. Both endpoints return `403` when public reads are disabled. The specific record is chosen by the app creator while configuring the block; the generated-app user does not choose it at runtime.

The current-user endpoint requires the project-scoped generated-app JWT and applies ownership in the database query. The collection must allow `read: "own"` or `read: "public"`. It returns that user's records newest first; the page runtime uses the first record. Login and logout invalidate the page's collection-data cache so bound Text/Hero values refresh without reloading the project. When no user is signed in or the user has no owned record, the block displays its static fallback.

These selectors cover fixed profiles, highlighted records, recent announcements, latest status, and simple signed-in-user dashboards. They are not a complete querying system.

Future selectors should extend the binding contract explicitly rather than reintroducing a separate page-source model. Likely selectors are:

```text
latest
record selected by a generated-app user
first matching filter
```

Those selectors require separate product and authorization work.

## Resolution And Fallback

For a collection binding, the runtime uses the dynamic value only when:

- the collection exists
- public reads are enabled
- a record exists
- the configured field still exists
- the record contains a value for that field

Otherwise it uses `fallback` when explicitly present, then the original static prop.

This applies during loading as well. Text should not disappear or resize unpredictably while a request is in progress.

## Editor Experience

Text and Hero expose this Inspector flow:

```text
Value source
  Static content
  Page variable
  Collection data

Collection data
  Collection: Tasks
  Record: Latest record | Specific record | Signed-in user's newest record
  Specific record: Inspection #1042
  Field: Title
```

The UI displays collection, record, and field labels, while the schema saves stable IDs. The creator-only record picker loads records through the authenticated owner API. Latest and specific runtime rendering use public collection endpoints, so the Inspector tells the creator to enable public reads for those selectors.

The signed-in-user selector does not expose a record picker. Generated-app identity determines the record at runtime. The Inspector instead warns when the collection allows neither own-record reads nor public reads.

Bound text-like blocks disable inline editing because their displayed value is runtime-controlled. Their static fallback remains editable in the Inspector.

## Actions

Current actions are:

```text
navigate
submitData
updateCurrentUserRecord
deleteCurrentUserRecord
openUrl
setPageState
```

`setPageState` targets a stable variable ID. Its value may be static or come from a live editable Text block.

`submitData` explicitly lists the field block IDs it submits. When it targets a project collection, those values are stored under the collection's stable field keys.

`updateCurrentUserRecord` maps live same-page fields to collection keys and updates the signed-in user's newest owned record. `deleteCurrentUserRecord` confirms before deleting that newest owned record. Both require a readable own-record collection plus the matching own update/delete policy. Bindings remain read-only; mutations belong in the action system.

## Record Selection Boundary

End-user record selection and record-aware navigation can be designed later using an explicit page-parameter contract. Creator-selected specific records do not provide that runtime behavior.

## Security Boundary

Latest and specific Text/Hero bindings require `access.read = "public"` because those selectors make anonymous collection-read requests. Current-user bindings require a valid generated-app session and `access.read = "own"` or `access.read = "public"`. A binding is presentation configuration, not authorization.

Builder authentication and generated-app user authentication are separate concerns. Private current-user data depends on:

- generated-app signup/login/session behavior - implemented
- a stable project-scoped app-user ID - implemented
- record ownership metadata - implemented for authenticated submissions
- backend read/write policies for every collection operation - implemented
- owner-scoped database filters that prevent cross-user record reads or mutations - implemented

Generated-app authentication uses `signUpAppUser`, `loginAppUser`, and `logoutAppUser` Button actions. The actions read editable Text fields by stable block ID. Builder JWTs and generated-app JWTs use separate payload contracts, and production may configure a separate `APP_USER_JWT_SECRET`. Owner-scoped APIs and current-user display bindings use the same server-derived generated-app identity. The client supplies a runtime JWT, but it never supplies the ownership ID used by the database filter.

Client-side hidden fields, missing blocks, or guessed IDs must never be treated as access control.

## Web And Android Parity

Both runtimes must:

- decode the same `RuntimeValueRef`
- scan the same page bindings
- deduplicate collection-and-selector requests
- call the matching latest-record, specific-record, or owner-scoped route
- refresh current-user bindings after generated-app login or logout
- refresh affected collection bindings after successful submission, update, or deletion
- map stored field keys to stable field IDs
- render boolean values consistently as `Yes` or `No`
- preserve static fallback for loading, empty, missing, and error states
- ignore unknown future sources safely instead of crashing

## Compatibility

- Projects without `bindings` continue rendering static props.
- `bindings` are optional and additive.
- Collection bindings without a `record` selector continue reading the latest record.
- Renaming collection or field labels does not break saved IDs.
- Deleting a collection or field produces fallback content rather than a runtime crash.
- Malformed and unsupported references normalize to no binding.
- This slice does not change schema version because the fields are optional and old runtimes already ignore unknown JSON keys.

## Test Requirements

Shared contract tests cover:

- supported reference normalization
- malformed reference rejection
- latest, specific, and current-user selector normalization
- distinct cache keys for different records in the same collection
- stable field-ID resolution
- static fallback while loading
- no mutation of saved block props
- deduplication of repeated collection bindings on one page

Release checks also require:

- frontend TypeScript/Vite build
- backend TypeScript build and test suite
- Android Kotlin compile
- manual Text and Hero binding checks in web preview
- manual parity check in Android preview
- specific-record deletion fallback verification
- `403` verification when public reads are disabled
- signed-in-user newest-owned-record verification with two generated-app users
- login/logout refresh and signed-out fallback verification
- empty-collection fallback verification

## Decision Summary

1. Text and Hero can display hosted collection data directly.
2. The creator can choose the latest record, one specific record, or the signed-in user's newest owned record; generated-app users cannot manually select records yet.
3. Pages coordinate data loading; blocks do not fetch independently.
4. Bindings store stable collection and field IDs.
5. Static content remains the fallback and design-time representation.
6. Web and Android implement the same persisted contract.
7. End-user-selected, filtered, and sorted record selectors remain later milestones.
