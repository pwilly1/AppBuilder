# Container And Template System

Status: DRAFT

## Purpose

Apptura needs a way to build more complex app screens without returning to large, rigid section blocks. The system should make simple blocks composable while keeping the saved project schema understandable, portable, and renderable in both the web editor and Android native preview.

This design separates three concepts:

```text
Container = saved runtime parent and optional visual surface
Template  = editor-time recipe that inserts independent blocks
Component = future linked/reusable instance system
```

The first implementation should be deliberately narrow. Containers solve grouping and proportional layout. Templates solve faster creation. Components, nested layout trees, marketplace templates, and functional data behavior are deferred.

## Product Model

Containers are true logical parents. A container can own simple atomic blocks, but containers cannot own other containers in v1.

```text
Page
|-- Atomic block
|-- Atomic block
`-- Container
    |-- Atomic block
    `-- Atomic block
```

Templates are not stored as reusable instances. In v1, a template inserts normal independent atomic blocks onto the page. After insertion, there is no link back to the template definition.

## Confirmed Behavior

- The editor displays one continuous page grid.
- A container occupies normal page-grid cells.
- Child blocks use the same grid-cell dimensions as page blocks.
- Child block placements are stored relative to the container.
- Moving a container moves the container and all children as one group.
- Children keep their relative coordinates when the container moves.
- Resizing a container proportionally updates child positions and grid bounds.
- Container resizing does not change fonts, icon sizes, padding, colors, or content styling.
- Container resizing is blocked if any child would collide, leave bounds, or shrink below its own valid size.
- Dragging a child outside a container detaches only that child.
- Users enter explicit **Edit contents** mode before selecting or editing children.
- Single-click selects the container first.
- Double-clicking a container or clicking **Edit contents** enters child-editing mode.
- Containers cannot be nested initially.
- Containers have optional visual styling with transparent defaults.
- Deleting a container asks whether to delete its children or preserve them on the page.
- Templates are available through a `Blocks | Templates` control in the left panel.
- Template insertion uses a grid placement ghost/preview.
- Template insertion succeeds only when the full template fits.
- Inserted template blocks are independent and are not linked to the template definition.

## Supported Container Children

Containers support only simple atomic blocks in v1:

- text
- hero
- navButton
- shape
- badge
- icon
- input
- textarea
- checkbox
- toggle
- progressBar

Containers do not support:

- nested containers
- legacy business blocks
- contact forms
- complex sections
- future data-bound blocks unless explicitly added later

This keeps the first version predictable and limits Android parity risk.

## Schema Direction

Keep `Page.blocks` flat and add the parent relationship directly to `Block`.

```ts
type Block = {
  id: string
  type: BlockType
  parentId?: string
  props: BlockProps
  layout?: BlockRuntimeLayout
  render?: BlockRenderLayout
}

type ContainerProps = {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  opacity: number
}
```

`parentId` does not belong inside `layout`. It is ownership metadata, not placement metadata. A top-level block has no `parentId`. A child block has `parentId` set to the owning container block ID.

Example:

```json
{
  "blocks": [
    {
      "id": "container-1",
      "type": "container",
      "props": {
        "backgroundColor": "transparent",
        "borderColor": "transparent",
        "borderWidth": 0,
        "borderRadius": 0,
        "opacity": 1
      },
      "layout": {
        "grid": { "colStart": 3, "rowStart": 5, "colSpan": 12, "rowSpan": 10 }
      }
    },
    {
      "id": "text-1",
      "type": "text",
      "parentId": "container-1",
      "props": { "value": "Example" },
      "layout": {
        "grid": { "colStart": 2, "rowStart": 2, "colSpan": 8, "rowSpan": 2 }
      }
    }
  ]
}
```

For a top-level block, `layout.grid` is relative to the page. For a child block, `layout.grid` is relative to its container. Relative `colStart` and `rowStart` begin at `1`.

The child coordinate range is determined by the container span:

```text
child colStart + colSpan - 1 <= container colSpan
child rowStart + rowSpan - 1 <= container rowSpan
```

No duplicate `childIds` list is stored on the container. Children are derived by filtering blocks whose `parentId` equals the container ID. This avoids two competing ownership sources.

Adding `parentId` and `container` requires schema-version and migration coverage.

## Hierarchy Rules

Hierarchy validation enforces:

1. `parentId` must refer to a container on the same page.
2. A container cannot have `parentId` in v1.
3. Only approved atomic block types can be children in v1.
4. Child grid bounds must fit inside the parent span.
5. Children under the same parent cannot overlap.
6. Top-level blocks collide with the container rectangle, not with each child separately.
7. A container move is valid only if the whole group remains inside page bounds and avoids top-level collisions.
8. A container resize is valid only if every proposed child placement remains valid.

Initial validation happens at runtime boundaries:

- Frontend migration/load repairs invalid hierarchy before editor state uses it.
- Android defensively treats invalid or orphaned children as top-level instead of crashing.
- Backend keeps flexible project JSON for now.

Strict backend schema validation can be added later once the hierarchy model is stable.

## Orphan And Invalid Data Recovery

Saved projects must remain loadable even if hierarchy data is malformed.

Recovery rules:

- Missing parent container: clear `parentId`.
- Parent points to non-container: clear `parentId`.
- Nested container: clear the child container's `parentId`.
- Unsupported child type: clear `parentId`.
- Child placement exceeds parent: clear `parentId` and relocate.
- Child collision inside parent: clear `parentId` and relocate the affected child.

Relocation should use the existing first-valid-placement behavior. Do not simply clamp into the page if that would create a collision.

If relocation cannot find space, keep the block loadable with the safest fallback placement and surface a non-blocking warning in the editor later. Project loading should not fail because of hierarchy repair.

## Editor State

Editor-only state tracks the active editing scope:

```ts
type EditorScope = {
  containerId: string | null
}
```

Selection behavior:

```text
Normal mode
  click container        -> select container
  double-click container -> enter Edit contents mode
  click Edit contents    -> enter Edit contents mode
  click child            -> select parent container, not child

Edit contents mode
  click child            -> select child
  click empty container  -> select container
  click outside          -> exit container scope
  press Escape           -> exit container scope
```

The canvas should show a clear scoped-container outline and a small `Editing container` indicator while child editing is active.

## Block Transactions

Container operations must be atomic. The current project-state API should gain a transaction-style helper, for example:

```ts
applyBlockTransaction((blocks) => nextBlocks)
```

This is needed because attaching, detaching, moving, resizing, deleting, and template insertion can update several blocks at once. Each completed operation should produce one undo-history entry, not one entry per changed child.

## Shared Hierarchy Helpers

Add pure shared helpers before editor interaction work:

```text
shared/schema/blockHierarchy.ts
```

Expected helper responsibilities:

- index blocks by `parentId`
- get children for a container
- validate hierarchy
- repair invalid hierarchy
- attach block to container
- detach block from container
- convert page coordinates to relative coordinates
- convert relative coordinates to page coordinates
- calculate proportional child placements during container resize
- validate sibling collisions inside a parent
- validate top-level collisions against container rectangles

The web editor, web preview, migration code, template insertion, and Android contract should all follow the same hierarchy rules.

## Adding And Attaching Children

An empty container can receive blocks in two ways:

1. Enter Edit contents mode and add a block from the palette.
2. Drag an existing page block into the container.

Attach conversion:

```text
page colStart - container colStart + 1 = relative colStart
page rowStart - container rowStart + 1 = relative rowStart
```

The attach operation succeeds only when:

- the block type is allowed inside containers
- the converted placement fits inside the container
- the converted placement does not collide with another child

Invalid drops snap back.

Adding or attaching a child is one undoable history operation.

Multi-select and `Create container from selection` are deferred.

## Detaching Children

While editing a container, dragging a child beyond the parent boundary displays a `Remove from container` preview.

Detach conversion:

```text
container colStart + relative colStart - 1 = page colStart
container rowStart + relative rowStart - 1 = page rowStart
```

The detach succeeds only if the resulting page placement is valid and does not collide with another top-level block. Invalid drops leave the child attached.

Detaching clears `parentId` and is one undoable history operation.

## Moving Containers

Moving a container changes only the container's page-grid placement. Child placements remain relative and unchanged.

The move succeeds only if:

- the container rectangle remains inside page bounds
- the container rectangle does not collide with another top-level block
- no invalid hierarchy is introduced

Collision detection treats the entire container rectangle as occupied. This keeps page-level collision checks compatible with the current no-overlap model.

Invalid moves snap back.

## Resizing Containers

Container resizing proportionally changes child positions and grid bounds while preserving content styling.

For each axis:

```text
positionRatio = (oldStart - 1) / oldContainerSpan
sizeRatio     = oldChildSpan / oldContainerSpan

newStart = round(positionRatio * newContainerSpan) + 1
newSpan  = round(sizeRatio * newContainerSpan)
```

Resize validation runs as a transaction:

1. Snapshot the container and all child placements.
2. Calculate proposed child placements.
3. Validate each child against its registered grid constraints.
4. Validate every child against parent bounds.
5. Check sibling collisions.
6. Commit the container and every child together if valid.
7. Otherwise block the resize and keep the last valid dimensions.

Content scaling remains separate. Container resizing does not modify `resizeBehavior`, `scaleBase`, font sizes, icon sizes, or padding values.

## Deleting Containers

Deleting a non-empty container opens three choices:

1. **Delete container and children**: remove the parent and every attached child.
2. **Remove container, keep children**: convert every child placement to page coordinates, clear `parentId`, validate the complete result, then remove the parent.
3. **Cancel**.

If preserving children would create collisions or out-of-bounds placements, the editor blocks that option and explains why.

Deleting an empty container requires no additional choice beyond the normal delete confirmation behavior.

## Container Rendering

The container renderer provides an optional surface:

- background color
- border color and width
- corner radius
- opacity

Defaults are transparent and visually empty. Editor selection outlines are editor-only and never appear in web or Android preview.

No container padding is included in v1. Internal spacing is represented by empty grid cells so the editor, web preview, and Android preview all use the same grid math.

The page renderer groups blocks by `parentId` before rendering:

```text
Page blocks
  -> repair and validate hierarchy
  -> build hierarchy index once
  -> render top-level blocks
  -> for each container, render attached children in relative grid coordinates
```

`BlockRenderer` should continue to render one block. A page-level hierarchy adapter should decide which blocks are top-level and which children are passed into a container renderer.

The Android renderer performs the same grouping and uses the existing grid constants and render metadata. Android read-only rendering should be implemented in the same phase as web read-only rendering so parity problems are caught early.

## Template Model

Templates are static TypeScript definitions used only by the editor. They are not added to `BlockType` and are not stored as template instances.

Recommended file location:

```text
app-builder/frontend/src/shared/schema/templates.ts
```

The definitions should be schema-shaped so backend/user-created templates can be added later, but v1 templates remain hardcoded repo data.

```ts
type TemplateDefinition = {
  id: string
  name: string
  description: string
  category: 'section' | 'page'
  preview: string
  bounds: GridSpan
  blocks: TemplateBlockDefinition[]
}
```

V1 templates contain only independent atomic blocks. They do not contain containers yet.

Insertion flow:

1. User opens the Templates tab.
2. User chooses a template preview card.
3. The editor displays a ghost preview for the complete template bounds.
4. Grid collision logic validates every block in the template.
5. If any block collides or leaves the page, insertion is blocked.
6. On a valid click, generate new IDs for every inserted block.
7. Insert all blocks atomically as one undo-history entry.

After insertion, the project contains only normal blocks. Editing the template definition later does not update existing projects.

Initial templates should stay simple:

- Hero layout using hero/text/navButton
- Basic form mockup using text/input/textarea/navButton
- Feature row using icon/badge/text blocks

Container-based section templates can be added after containers are stable.

## Failure Handling

| Failure | Required behavior |
| --- | --- |
| Missing parent container | Clear invalid `parentId`, relocate block to a first valid page placement, and keep project loadable. |
| Parent points to non-container | Clear invalid `parentId`, relocate if needed, and keep project loadable. |
| Child placement exceeds parent | Repair at load by detaching and relocating instead of crashing. |
| Unsupported child type | Detach from container and preserve the block as top-level. |
| Attach or detach collision | Show blocked preview and snap back. |
| Container move creates collision | Show blocked preview and snap back. |
| Container resize creates invalid child state | Block the resize and keep the last valid dimensions. |
| Template has invalid internal schema | Reject insertion and show a clear editor error. |
| Template placement partially collides | Reject the full insertion; do not insert partial templates. |
| Project save fails after a hierarchy edit | Preserve local state and expose retry through existing save behavior. |
| Android sees unsupported container data | Treat invalid/orphaned children as top-level or skip invalid hierarchy safely rather than crash. |

## Delivery Phases

### Phase 1: Pure hierarchy and geometry helpers

- Add `container` type, top-level `Block.parentId`, props, constraints, and schema version.
- Add parent lookup, validation, repair, coordinate conversion, and proportional-resize helpers.
- Add transaction API for multi-block updates.
- Add unit tests before editor interactions.

### Phase 2: Read-only web and Android rendering

- Add web container renderer and page-level hierarchy assembly.
- Render saved containers and children in web preview.
- Add Android model support for `parentId`.
- Add Android Compose container styling and relative child grid rendering.
- Add migration and malformed-project safeguards.

### Phase 3: Core editor interactions

- Add empty container from the palette.
- Add explicit Edit contents mode.
- Add child insertion, attachment, detachment, container movement, proportional resizing, and deletion choices.
- Ensure each compound operation produces one history entry.

### Phase 4: Static templates

- Add `Blocks | Templates` navigation.
- Add static template definitions and preview cards.
- Add placement preview and all-or-nothing atomic insertion.
- Ship simple atomic templates first.

### Phase 5: Cross-runtime QA and documentation

- Verify shared saved projects across web and Android device widths.
- Run unit, build, Android compile, and manual regression coverage.
- Update architecture, schema reference, features, roadmap, and block-authoring documentation.
- Add a polished sample project using containers and templates.

## Testing Strategy

Pure helper tests should cover:

- grouping blocks by parent
- valid parent lookup
- invalid parent repair
- no nested containers
- allowed child type validation
- orphan relocation
- page-to-relative coordinate conversion
- relative-to-page coordinate conversion
- child bounds inside parent
- sibling collision detection
- top-level collision against container rectangles
- proportional resize rounding
- blocked resize when child constraints fail
- attach success and failure
- detach success and failure
- atomic template insertion with ID remapping
- undo/redo around compound block operations

Baseline checks:

```powershell
cd app-builder/frontend
npx.cmd tsc --noEmit -p tsconfig.app.json
npx.cmd tsc --noEmit -p tsconfig.json
npm.cmd run build
cd ..\native-preview\Android
.\gradlew.bat :app:compileDebugKotlin
```

Manual checks:

- Create an empty container.
- Move and resize an empty container.
- Add each supported atomic block inside a container.
- Drag a block into a container.
- Drag a child out of a container.
- Move a non-empty container.
- Resize a non-empty container.
- Delete a non-empty container with both delete choices.
- Insert each template into open space.
- Confirm blocked template insertion does not partially insert blocks.
- Save, reload, undo, and redo each compound operation.
- Open the same project in Android preview.

## Performance Notes

- Build the hierarchy index once per page render, not once per container.
- Memoize hierarchy grouping from the current `page.blocks` array.
- Keep collision checks scoped to the active parent where possible.
- Avoid recursive traversal in v1 because nested containers are not supported.
- Template insertion should validate the full block list once, then commit once.
- Android should use the same page-level grouping concept rather than filtering the full block list repeatedly for every container.

## Success Criteria

- Empty containers can be created, selected, styled, moved, resized, and deleted.
- Atomic blocks can be added to, attached to, and detached from containers.
- Moving a container preserves every child layout.
- Resizing a container proportionally updates child bounds without changing content styling.
- Invalid operations never corrupt project state or create overlaps.
- Undo and redo treat each container operation atomically.
- Templates insert valid independent block groups through placement preview.
- The same saved project renders without crashes in web preview and Android preview.
- Legacy and malformed project data remain loadable through migration safeguards.

## Not In Scope

- Nested containers
- Multi-select and grouping existing selections
- Linked component instances or centralized component updates
- Recursive layout trees
- Automatic row/column flow layout
- Container padding
- Image assets
- Data binding or functional form submission for mockup controls
- User-created template publishing or marketplace distribution
- Template updates applied to existing projects
- Templates containing containers
- Backend-owned template storage
- Strict backend hierarchy validation

## Open Questions

- Exact initial container default span and visual defaults.
- Whether page-level templates belong in the Templates tab or project/page creation flow.
- Whether to add Vitest or another frontend unit-test runner for pure hierarchy helper tests.

## Recommended Next Step

Implement Phase 1 only after this design is accepted. Do not combine schema helpers with canvas interaction changes in the first commit.
