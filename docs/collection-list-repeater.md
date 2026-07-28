# Collection List / Repeater Implementation Plan

## Status

Proposed. This feature is not implemented yet.

## Purpose

A Collection List, stored internally as a `repeater` block, displays multiple records from one app-data collection. The creator designs one item template from normal blocks, and the runtime repeats that template once for every loaded record.

This is different from a Text or Hero collection binding:

- Text and Hero display one field from one selected record.
- A repeater creates one visual item for each record in a collection result.
- Blocks inside the item template resolve their values from the current repeated record.

The feature must use the existing shared project schema and produce equivalent web and Android behavior. It must not revive the removed hardcoded data-list renderer.

## Product Decision

The first version will use a configurable item template rather than a fixed row design.

The creator can:

1. Add a **Collection List** to the page.
2. Choose a collection and record scope.
3. Enter **Edit item design** mode.
4. Add, move, resize, bind, and style supported blocks in one template item.
5. Preview the same item repeated with actual collection records.

The first version remains deliberately constrained. It supports a vertical, single-column list and simple display/action blocks. It does not support arbitrary nested layouts or editable repeated forms.

## Visual Model

The creator designs one item:

```text
+------------------------------------------------+
| [Task name]       [Status badge]       [Open]  |
+------------------------------------------------+
```

The runtime repeats it:

```text
+------------------------------------------------+
| Inspect warehouse  Pending             Open    |
+------------------------------------------------+
| Deliver supplies   Complete            Open    |
+------------------------------------------------+
| Repair equipment   Urgent              Open    |
+------------------------------------------------+
```

Each repeated Text, Hero, or Badge resolves against a different current record. A Button in a row can eventually navigate to a detail page while carrying that row's record identity.

## First Milestone Scope

### Included

- One new `repeater` block type, presented as **Collection List**.
- One collection per repeater.
- `all` and `currentUser` record scopes.
- `newest` and `oldest` ordering.
- A bounded initial record count, with a maximum of 20.
- One vertically repeated item template.
- Configurable item height and gap.
- Text, Hero, Badge, Icon, Shape, and Button as initial template children.
- `currentItem` collection bindings for repeated Text/Hero content.
- Loading, empty, error, and access-denied states.
- Web editor and preview support.
- Native Android preview support in the same delivery sequence.
- Stable runtime keys for each repeated block instance.

### Deferred

- Editable Text fields, checkboxes, toggles, or other form controls inside repeated items.
- Submitting or mutating a record directly from a repeated item.
- Nested repeaters.
- Containers inside repeaters.
- Repeaters inside containers.
- Horizontal lists, grids, masonry, and multiple columns.
- Arbitrary field filters and field-based sorting.
- Relationships, joins, and nested collection queries.
- Infinite scrolling and offline caching.
- Per-item visual designs that differ from the shared template.

Repeated editable controls are deferred because current form values are keyed by saved block ID. Runtime copies of one template block would otherwise share the same value. A later implementation must use runtime instance IDs for row-local form state before editable children are allowed.

## Architecture Rules

1. `Page.blocks` remains a flat array.
2. The repeater owns one persisted item template through `Block.parentId`.
3. Runtime copies are never written into project JSON.
4. Child placements are relative to the item template, not the page.
5. The page or repeater runtime loads records; individual child blocks never fetch data.
6. Existing static props remain fallback content.
7. Collection and field references use stable schema IDs.
8. Backend access rules remain the authorization source of truth.
9. The same persisted contract must be decoded by web and Android.
10. Unsupported or malformed repeater data must fall back safely instead of crashing a project.

## Proposed Saved Schema

Add `repeater` to `BlockType`.

```ts
type RepeaterRecordScope = 'all' | 'currentUser'
type RepeaterRecordOrder = 'newest' | 'oldest'

type RepeaterProps = {
  collectionId: string
  scope: RepeaterRecordScope
  order: RepeaterRecordOrder
  limit: number
  itemRowSpan: number
  gapRows: number
  emptyText: string
}
```

Example:

```json
{
  "id": "task-list",
  "type": "repeater",
  "props": {
    "collectionId": "tasks",
    "scope": "all",
    "order": "newest",
    "limit": 10,
    "itemRowSpan": 4,
    "gapRows": 1,
    "emptyText": "No tasks yet"
  },
  "layout": {
    "grid": {
      "colStart": 1,
      "rowStart": 5,
      "colSpan": 16,
      "rowSpan": 18
    }
  }
}
```

The item template consists of normal blocks whose `parentId` is the repeater ID:

```json
{
  "id": "task-title",
  "type": "text",
  "parentId": "task-list",
  "props": {
    "value": "Task name"
  },
  "bindings": {
    "value": {
      "source": "collection",
      "collectionId": "tasks",
      "fieldId": "task-name",
      "record": {
        "mode": "currentItem"
      },
      "fallback": "Task name"
    }
  },
  "layout": {
    "grid": {
      "colStart": 1,
      "rowStart": 1,
      "colSpan": 10,
      "rowSpan": 2
    }
  }
}
```

For repeater children:

- `colStart` and `colSpan` are relative to the repeater width.
- `rowStart` and `rowSpan` are relative to one item.
- A child must fit inside `repeater.layout.grid.colSpan` and `props.itemRowSpan`.
- Children belonging to one template cannot overlap.

No duplicate `childIds` array is stored. Template children are derived by filtering `Page.blocks` by `parentId`.

## Runtime Record Context

Extend the collection selector:

```ts
type CollectionRecordSelector =
  | { mode: 'latest' }
  | { mode: 'currentUser' }
  | { mode: 'specific'; recordId: string }
  | { mode: 'currentItem' }
```

Extend the runtime context with an optional row record:

```ts
type RuntimeRecordContext = {
  collectionId: string
  recordId: string
  values: Record<string, string>
}

type RuntimeContext = {
  pageState: Record<string, string>
  collectionData: Record<string, RuntimeDataState>
  currentItem?: RuntimeRecordContext
}
```

`currentItem` has meaning only while rendering a repeated template instance. Page-level collection request collection must ignore `currentItem` references because the repeater supplies those records.

Resolution behavior:

```text
Repeater loads records
  -> runtime renders one item per record
  -> runtime derives a child context containing currentItem
  -> existing block-property resolution reads currentItem values
  -> static block props remain the fallback
```

The implementation must not mutate the shared page context while iterating. Each row receives a derived immutable context.

## Runtime Instance Identity

Persisted template blocks keep their normal schema IDs. Every rendered copy receives a temporary runtime instance ID:

```text
repeaterId:recordId:templateBlockId
```

Example:

```text
task-list:record-123:task-title
```

Web uses this value as the React key. Android uses it as the Compose item/content key. Future row-local form state and actions must also use the runtime instance ID rather than the template block ID alone.

## Editor Experience

### Palette

Add **Collection List** to the Data or Layout section. The user-facing name should describe the outcome; `repeater` remains an internal schema term.

### Inspector

The repeater Inspector initially exposes:

- Collection
- Records: All records or Signed-in user's records
- Order: Newest first or Oldest first
- Initial item count, clamped from 1 through 20
- Item height
- Gap between items
- Empty-state message
- **Edit item design** action

### Item Design Mode

Item design follows the existing explicit container-editing pattern:

- Selecting the repeater selects the whole list.
- Double-clicking it or choosing **Edit item design** enters its item scope.
- In item scope, supported blocks can be added and edited.
- Template children remain relative to one item boundary.
- Clicking outside or pressing Escape exits item design mode.
- The canvas clearly identifies that the creator is editing one repeated item.

Only the persisted template blocks are selectable. Ghost or preview repetitions must not create additional editor selections.

### Editor Preview

While editing the item, show the real template once and optional non-interactive ghost repetitions below it. Preview mode renders actual records.

When no collection is selected or no records exist, the editor still shows the template using its static fallback props. This keeps the item design editable without requiring seeded data.

## Hierarchy Integration

The current hierarchy helpers recognize `container` and `form` as child owners. Generalize that concept instead of duplicating hierarchy logic:

```text
child-owning block
  -> container
  -> form
  -> repeater
```

The shared hierarchy layer must distinguish:

- Container children use coordinates relative to the full container.
- Repeater children use coordinates relative to one repeated item.
- Allowed child types differ by parent type.

V1 does not allow any child-owning block to be nested under another child-owning block.

Migration and repair rules:

- Missing repeater parent: detach and relocate the child safely.
- Unsupported repeater child: detach and relocate.
- Child outside item bounds: detach and relocate instead of silently corrupting placement.
- Missing collection: keep the repeater loadable and show its empty/configuration state.
- Invalid scope, order, limit, item height, or gap: normalize to safe defaults.

## Backend Runtime API

Add a bounded public runtime list endpoint:

```http
GET /public/projects/:projectId/app-data/collections/:collectionId/records
    ?scope=all|currentUser
    &order=newest|oldest
    &limit=20
    &cursor=<opaque-cursor>
```

Suggested response:

```json
{
  "records": [
    {
      "id": "record-123",
      "values": {
        "taskName": "Inspect warehouse",
        "status": "Pending"
      },
      "createdAt": "2026-07-27T12:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Security requirements:

- `scope=all` requires collection read access of `public`.
- `scope=currentUser` requires a valid generated-app JWT.
- Current-user ownership is derived from the validated token on the server.
- The client never supplies an owner ID.
- `limit` is server-clamped to a safe maximum.
- Cursor contents are opaque to clients.
- Arbitrary MongoDB filters, field names, sort objects, and ownership predicates are never accepted from the client.

The service should reuse the canonical `AppDataRecord` model and app-data access checks. It must not create a second record-storage system.

## Web Runtime

The web implementation should:

1. Add schema and normalization support.
2. Add an API client for the runtime record-list endpoint.
3. Load records once per repeater query.
4. Render loading, empty, error, and ready states.
5. Derive a `currentItem` context for each row.
6. Resolve normal child blocks through the existing `BlockRenderer`.
7. Use stable runtime instance keys.
8. Keep editor selection and drag/resize behavior limited to the saved template, not runtime copies.

`BlockRenderer` should continue to render one normal block. A repeater-specific layout adapter should coordinate the record loop and pass each child through `BlockRenderer`.

## Android Runtime

Android must decode the same props and `currentItem` selector.

The Compose implementation should:

- Load through the same bounded runtime endpoint.
- Use `LazyColumn` for repeated records.
- Use stable runtime instance keys.
- Render each template block through the existing Android block renderer.
- Apply the same relative item-grid math as web.
- Preserve the same static fallback behavior.
- Show equivalent loading, empty, error, and access states.

The feature is not complete until a saved repeater project renders without crashing in Android preview.

## Record-Aware Navigation

Record-aware navigation should follow the initial display milestone rather than being mixed into the first schema patch.

Target behavior:

```text
Button inside repeated item
  -> Navigate to Task Details
  -> pass current record ID
  -> detail page loads that specific record
  -> Text/Hero blocks display fields from that record
```

This requires an explicit page-parameter contract and navigation parameter values. It must not create one destination page per record.

The follow-up design should add:

- Stable page parameter definitions.
- Parameter values on `navigate` actions.
- A runtime value source for the current repeated record ID.
- A record selector that can resolve the destination page's record parameter.
- Equivalent navigation state in web and Android.

Until that contract is implemented, repeated Buttons may use ordinary navigation or URL actions, but must not pretend to carry record identity.

## Delivery Sequence

### Phase 1: Shared contract and pure helpers

- Add `repeater` and its normalized props.
- Add `currentItem` collection selector and runtime record context.
- Generalize child-owner hierarchy helpers.
- Add allowed-child and item-bound validation.
- Add runtime instance-ID helper.
- Add schema, migration, binding-resolution, and hierarchy tests.

### Phase 2: Backend runtime list query

- Add the bounded record-list service method.
- Add route/controller handling.
- Enforce public and current-user read policies.
- Add cursor, order, and limit validation.
- Add service and route contract tests.

### Phase 3: Web read-only runtime

- Add the API client.
- Add repeater record loading.
- Render template children with row contexts.
- Add loading, empty, error, and access states.
- Verify fallback behavior and stable keys.

### Phase 4: Web editor

- Register Collection List and expose it in the palette.
- Add Inspector controls.
- Add item-design scope.
- Add supported-child insertion, movement, resizing, and deletion.
- Add non-interactive ghost preview.
- Keep compound changes atomic for undo/redo.

### Phase 5: Android parity

- Extend Kotlin schema normalization.
- Add the runtime list API call.
- Add Compose list and item-grid rendering.
- Add current-item binding resolution.
- Match web state and fallback behavior.

### Phase 6: Record-aware navigation

- Add page parameters.
- Add navigation parameter mapping.
- Pass current item record identity.
- Resolve a destination page's specific record.
- Implement and test web/Android parity.

### Phase 7: Stabilization

- Save/reload and migration QA.
- Undo/redo QA.
- Access-policy QA.
- Web/Android visual parity check.
- Performance testing with 20 records and several blocks per item.
- Documentation and demo-project updates.

## Test Plan

### Shared and frontend

- Normalize missing and malformed repeater props.
- Resolve `currentItem` values without mutating static props.
- Ignore `currentItem` bindings during page-level request collection.
- Generate stable runtime instance IDs.
- Validate supported and unsupported children.
- Validate child bounds and sibling collisions inside one item.
- Repair malformed parents and placements.
- Verify one editor operation creates one history entry.

### Backend

- Public list succeeds only for publicly readable collections.
- Current-user list requires a generated-app session.
- Current-user query cannot return another user's records.
- Invalid limits, orders, scopes, and cursors fail safely.
- Limit is bounded to 20 in the first milestone.
- Empty collections return an empty record array.
- Deleted collections and projects return the existing safe error contract.

### Web manual QA

- Add and configure a Collection List.
- Design an item from each supported child type.
- Bind Text/Hero to current-item fields.
- Save and reload without losing the template.
- Confirm multiple records render with different values.
- Confirm editor ghost items cannot be selected.
- Confirm loading, empty, error, and denied states.
- Confirm list resizing does not rewrite template block IDs.

### Android manual QA

- Load the same saved project used for web QA.
- Confirm record ordering and count match.
- Confirm row values and fallback content match.
- Confirm scrolling works on small and large devices.
- Confirm missing fields or records do not crash the preview.

### Build checks

```powershell
cd app-builder/frontend
npm.cmd run build

cd ../backend
npm.cmd run build

cd ../native-preview/Android
.\gradlew.bat :app:compileDebugKotlin
```

## Success Criteria

The first milestone is complete when:

- A creator can design one repeated item from supported normal blocks.
- A saved project contains one repeater and one persisted child template, not cloned records.
- Web and Android display multiple collection records using that template.
- Every row resolves Text/Hero values from its own current record.
- Public and current-user scopes enforce backend access rules.
- Empty, loading, failure, and denied states are understandable.
- Projects with malformed or missing repeater configuration remain loadable.
- Existing single-record Text/Hero bindings continue working unchanged.

## Follow-Up Opportunities

After the constrained implementation is stable:

1. Record-aware detail-page navigation.
2. Pagination or infinite scrolling.
3. Creator-configured filters and field sorting.
4. Horizontal and grid layouts.
5. Row-local editable controls using runtime instance IDs.
6. Owner-scoped update/delete actions for the selected row.
7. Offline list caching and synchronization.

These additions should extend the same repeater and runtime-context architecture rather than introduce separate list block types.
