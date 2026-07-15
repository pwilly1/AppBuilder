# Dynamic Data Binding Architecture

This document is the implementation reference for dynamic values, runtime state, and future data-driven pages in Apptura. Read it before changing block bindings, page data, generated-app users, state actions, or runtime data resolution.

## Status

This architecture is partially implemented. The first local page-state slice exists, while page data sources, generated-app users, and record mutation remain future work.

Apptura currently supports:

- static values in `block.props`
- schema-backed Navigate, Submit Data, Open URL, and Set Page State actions
- grouped form values and hosted app-data submission
- project-level typed data collections
- read-only Data List rendering for publicly readable collections
- page-scoped text variables with stable IDs and editor preview values
- property-level `pageState` bindings for Text `value` and Hero `headline`
- fixed or live Input/Textarea assignment to page variables from Button, Icon, and Image actions
- matching static fallback resolution in web and Android preview

Apptura does not yet have:

- app state actions
- page parameters
- page data-source resolution
- generated-app user accounts or a `currentUser` runtime
- record update/delete actions
- conditional expressions or a visual workflow engine

Do not document those future capabilities as implemented until they exist across the required runtimes.

## Product Goal

Allow a generated app to display and update information that depends on runtime context rather than only static editor values.

Target examples:

- A heading displays the signed-in app user's name.
- A profile page displays fields from that user's profile record.
- Text entered on one page is displayed on another page.
- A page displays a record selected elsewhere in the app.
- A form updates an existing record instead of only creating a submission.

This system turns blocks into data-driven views without making each block responsible for querying the backend.

## Core Decisions

### Keep properties, bindings, and actions separate

Each concept has one responsibility:

| Concept | Responsibility | Example |
| --- | --- | --- |
| Property | Static content or presentation | `fontSize: 24` |
| Binding | Supplies a runtime value to a property | Text comes from `profile.displayName` |
| Action | Performs work after an event | Navigate, submit, or update state |
| Runtime context | Holds values currently available to the page | Page data, parameters, state, form values |

A binding is not an action. Reading a name and displaying it must not execute a workflow.

### Pages own data loading

Blocks must not independently query collections or locate the current user's record.

Instead, a page declares named data sources:

```text
profile = current user's Profile record
```

Blocks then bind to the resolved page data:

```text
Hero text  -> profile.displayName
Text       -> profile.bio
Image src  -> profile.avatarUrl
```

This avoids duplicate requests, centralizes loading and error handling, simplifies the inspector, and makes web/Android behavior easier to keep consistent.

### Use stable IDs in saved schema

Saved bindings should reference stable page-data and collection-field IDs. User-facing names are labels and may change without breaking existing projects.

Avoid storing a free-form path such as `profiles.full_name` as the only reference. A renamed collection, page variable, or field would silently break it.

### Keep runtime implementations platform-specific but schema-compatible

The web preview and Android runtime may use different internal code, but they must consume the same saved binding JSON and produce equivalent outcomes.

DOM measurement, React-only context, or browser-only APIs must not become part of the persisted contract.

## Proposed Schema

The exact names may be adjusted during implementation, but the responsibilities should remain stable.

### Page data sources

A page declares the records or values it needs:

```ts
type PageDataSource = {
  id: string
  name: string
  kind: 'collectionRecord' | 'currentUserProfile'
  collectionId: string
  recordId?: RuntimeValueRef
}
```

Notes:

- `id` is the stable schema reference.
- `name` is the editor-facing label, such as `Profile`.
- `collectionRecord` resolves a record using a runtime record ID.
- `currentUserProfile` must wait for generated-app authentication and backend ownership rules.
- Query lists, filters, sorting, and relationships are later extensions, not part of the first milestone.

### Runtime value references

Bindings and future action inputs use one shared value-reference model:

```ts
type RuntimeValueRef =
  | {
      source: 'static'
      value: string
    }
  | {
      source: 'pageData'
      dataSourceId: string
      fieldId: string
      fallback?: unknown
    }
  | {
      source: 'pageParameter'
      parameterId: string
      fallback?: unknown
    }
  | {
      source: 'pageState'
      variableId: string
      fallback?: unknown
    }
  | {
      source: 'appState'
      variableId: string
      fallback?: unknown
    }
  | {
      source: 'formValue'
      fieldBlockId: string
      fallback?: unknown
    }
```

Do not implement every source at once. A shared type allows sources to be added deliberately without creating separate binding formats.

### Block bindings

Bindings are optional and property-specific:

```ts
type BlockBindings = Record<string, RuntimeValueRef>

type Block = {
  id: string
  type: BlockType
  props: Record<string, unknown>
  bindings?: BlockBindings
  // Existing layout fields remain unchanged.
}
```

Example:

```json
{
  "type": "text",
  "props": {
    "text": "Guest",
    "fontSize": 18
  },
  "bindings": {
    "text": {
      "source": "pageData",
      "dataSourceId": "profile-source-id",
      "fieldId": "display-name-field-id",
      "fallback": "Guest"
    }
  }
}
```

`props.text` remains the static/default editor value. When the binding resolves successfully, its value replaces that property at render time. The saved `props` object must not be mutated by resolution.

## Runtime Model

Each rendered page receives a runtime context containing only currently available values:

```ts
type RuntimeContext = {
  pageData: Record<string, RuntimeDataState>
  pageParameters: Record<string, unknown>
  pageState: Record<string, unknown>
  appState: Record<string, unknown>
  formValues: Record<string, unknown>
  currentAppUser?: AppUserIdentity
}

type RuntimeDataState =
  | { status: 'loading' }
  | { status: 'ready'; value: unknown }
  | { status: 'empty' }
  | { status: 'error'; message: string }
```

The binding resolver receives a `RuntimeValueRef`, the expected property type, and the runtime context. It returns a resolved value or the configured fallback.

Resolution must be:

- pure and deterministic
- safe for missing sources and fields
- type-aware
- unable to mutate project or runtime state
- implemented with matching behavior in web and Android

## Page Lifecycle

The intended flow is:

```text
Open page
  -> read page parameters
  -> initialize page state
  -> resolve page data sources once
  -> expose loading/ready/empty/error states
  -> resolve block property bindings
  -> render blocks
```

When a relevant parameter or state variable changes, only affected page data and bindings should be recomputed. Blocks must not make their own network requests during normal rendering.

## Navigation And Data

Static navigation remains valid:

```text
Button with Navigate action -> fixed destination page
```

Dynamic navigation may later pass page parameters:

```text
Navigate to Profile page
  parameter profileRecordId = selected record ID
```

The destination page uses that parameter to resolve its declared `profile` page-data source. Multiple list rows can therefore reuse one detail page instead of requiring one hard-coded page per database record.

Passing data during navigation is an extension of the Navigate action. Displaying the resulting data remains a binding responsibility.

## Actions

Current actions are:

```text
navigate
submitData
openUrl
setPageState
```

`setPageState` targets a stable page-variable ID and receives a `RuntimeValueRef`. The editor currently exposes a fixed text value or a live Input/Textarea value. Field references use stable block IDs rather than labels or submission keys. The value updates bound blocks immediately and resets when that page runtime is recreated; it is not written to hosted app data.

Likely future actions are:

```text
setAppState
createRecord
updateRecord
deleteRecord
```

Future action values should use `RuntimeValueRef` so an update can use static values, form input, page state, or page data without inventing another expression format.

Do not build arbitrary action chains, conditions, loops, or a general expression language in the first binding milestone.

## Generated-App Users And Security

Builder accounts and generated-app user accounts are separate identities. The current Apptura login authenticates the person building an app; it must not automatically become the `currentUser` inside every generated app.

Before `currentUserProfile` is implemented, Apptura needs:

- generated-app user signup/login/session behavior
- a stable app-user ID
- record ownership fields such as `ownerUserId`
- backend authorization for every record read and write
- explicit collection access rules

Bindings are presentation configuration, not authorization. A hidden block or missing binding must never be the mechanism that protects private data.

## Editor Experience

The inspector should not expose raw JSON paths or require users to understand runtime internals.

Recommended property control:

```text
Text value
  ( ) Static text
  ( ) From data

From data
  Page data -> Profile -> Display name

Preview value
  Preston
```

The editor must provide:

- source and field pickers using names, not IDs
- data-type compatibility filtering
- sample/preview data
- a visible fallback setting
- warnings for deleted or unavailable references
- clear loading, empty, and error previews

The saved schema still stores stable IDs behind these labels.

## First Implementation Milestone

Progress on the smallest complete vertical slice:

- Completed: shared binding and page-state reference schema types.
- Completed: pure binding-resolution helpers in web and Android.
- Completed: page-scoped text variables with initial preview values.
- Completed: property binding controls for Text and Hero text.
- Completed: matching web and Android rendering with static-property fallback.
- Completed: missing-variable warnings and safe missing-reference behavior.
- Completed: schema-backed `setPageState` actions with fixed and Input/Textarea values in web and Android.
- Completed: backward-compatible static `props` rendering.
- Remaining: focused automated resolver tests.
- Remaining: page parameters.

Do not include generated-app authentication, collection queries, record mutation, conditional visibility, or visual workflow chains in this milestone.

After this slice is stable, add page-owned collection-record sources. Add current-user profile sources only after the app-user identity and authorization model exists.

## Compatibility And Migration

- Existing projects without `bindings` render exactly as they do today.
- Bindings are optional and additive.
- Static props remain valid fallbacks.
- Unknown binding sources or deleted fields resolve safely to fallback/empty state; they must not crash a runtime.
- Schema normalization should preserve valid future-safe data and remove malformed references deliberately.
- Any schema-version change must be reflected in web migration, backend validation, Android models, and documentation.

## Testing Requirements

### Shared behavior

- Resolves each supported source correctly.
- Uses fallback for missing source, field, or incompatible type.
- Does not mutate the project schema.
- Survives malformed or unknown binding JSON.
- Preserves static props when no binding exists.

### Web editor and preview

- Binding controls persist stable IDs.
- Renaming a source or field label does not break a binding.
- Editor sample data matches preview resolution.
- Page changes reset page-scoped values according to the documented lifecycle.

### Android

- Kotlin models decode bound and unbound projects.
- Resolver behavior matches web for ready, empty, missing, and fallback values.
- Unsupported future sources fail safely rather than crashing.

### Security

- Private records cannot be read by changing client-side IDs.
- App users cannot read or modify records owned by another user.
- Public-read collections remain the only anonymous collection-read path until broader policies are implemented.

## Deferred Capabilities

The following are intentionally deferred:

- arbitrary expressions and formulas
- conditions and conditional visibility
- computed fields
- collection list queries with filters and sorting
- relational joins
- reusable workflow/action chains
- offline synchronization of bound records
- generated-app user authentication
- record update/delete UI

They should build on the same value-reference and page-data model rather than bypassing it.

## Decision Summary

1. Build dynamic data binding because it is required for useful personalized apps.
2. Do not turn bindings into actions.
3. Let pages load named data once; blocks only consume it.
4. Store stable IDs, not only field names or free-form paths.
5. Start with Text/Hero and local page/app runtime values.
6. Treat generated-app identity and backend authorization as prerequisites for current-user data.
7. Require web/Android parity for every persisted binding source.
8. Delay a general visual programming language until the smaller binding system is proven.
