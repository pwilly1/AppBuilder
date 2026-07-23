# Block and Schema Reference

Apptura stores projects as schema data so the web editor, web preview, and Android preview can render the same project. The canonical TypeScript definitions are in `app-builder/frontend/src/shared/schema/types.ts`.

## Project Schema

```ts
type Project = {
  schemaVersion: number
  id: string
  name: string
  pages: Page[]
  dataCollections?: AppDataCollection[]
}

type Page = {
  id: string
  title?: string
  path?: string
  appearance?: {
    backgroundColor?: string
  }
  stateVariables?: PageStateVariable[]
  blocks: Block[]
}

type Block = {
  id: string
  type: BlockType
  parentId?: string
  props: Record<string, any>
  bindings?: Record<string, RuntimeValueRef>
  layout?: BlockRuntimeLayout
  render?: BlockRenderMetadata
  editorPlacement?: BlockEditorPlacement
}
```

`editorPlacement` is transitional compatibility data. New runtime behavior should use `layout.grid`, `render`, and `props`.
`parentId` is ownership metadata for container children. Top-level blocks omit it.
`Page.appearance.backgroundColor` stores an optional six-digit hex color for the full page surface. Web and Android preview normalize invalid or missing values back to white for older projects.

Pages may define text `stateVariables` with stable IDs. Text `value` and Hero `headline` may bind either to a page variable or directly to a stable project collection/field ID through `block.bindings`. The creator may select the latest record or one specific record; bindings without a selector default to latest for compatibility. Button, Icon, and Image may use `setPageState` to assign a fixed value or the current value of an editable Text block during a preview session. Runtime resolution never mutates `props`; the static property remains the fallback for old projects and missing, loading, empty, or failed runtime data. End-user record selection and generic page parameters are not implemented yet. See [Dynamic Data Binding Architecture](dynamic-data-binding.md).

## Layout Contract

The editor uses a fixed 16-column by 29-row workspace. Rows are 28 pixels in the web editor and 28 dp in Android.

```ts
type GridPlacement = {
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
}
```

Grid positions are one-based. `colStart: 1` and `rowStart: 1` identify the top-left grid cell.
For container children, those coordinates are relative to the container span rather than the full page grid.

```ts
type BlockRuntimeLayout = {
  sectionId?: string
  slotId?: string
  order?: number
  width?: 'full' | 'content' | 'half'
  align?: 'start' | 'center' | 'end'
  spacingTop?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  spacingBottom?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  layoutClass?: BlockLayoutClass
  grid?: GridPlacement
  resizeBehavior?: 'boxOnly' | 'scaleContent'
  scaleBase?: { colSpan: number; rowSpan: number }
}
```

`scaleContent` is currently meaningful for Hero, Text, and Button. Other blocks resize their occupied/rendered area without using the text content-scale path.

## Render Metadata

Render metadata controls how content sits inside its occupied grid area.

```ts
type BlockRenderMetadata = {
  widthPx?: number
  heightPx?: number
  offsetX?: number
  offsetY?: number
  alignX?: 'start' | 'center' | 'end'
  alignY?: 'start' | 'center' | 'end'
}
```

The grid remains the collision and placement boundary. Render width, height, and offsets are clamped to that boundary.

## Registry Contract

`app-builder/frontend/src/shared/schema/registry.ts` is the source of truth for creating blocks. Every registry entry defines:

| Field | Purpose |
| --- | --- |
| `displayName` | Human-readable block name |
| `defaultProps` | Content and style values assigned at creation |
| `layoutClass` | Broad runtime/layout classification |
| `defaultLayout` | Initial width, alignment, and spacing metadata |
| `gridConstraints` | Default, minimum, and maximum grid spans plus behavior flags |
| `defaultRender` | Initial alignment inside the occupied grid area |

`createBlock(type, overrides)` merges prop overrides with registry defaults and creates the block ID, layout metadata, and render metadata.

`isSupportedBlockType(value)` checks whether a saved type still exists in the registry. Load-time migration removes unsupported legacy blocks before placement calculations run.

## Current Block Types

| Type | Main props | Default grid span | Runtime notes |
| --- | --- | --- | --- |
| `hero` | `headline`, `headlineSize`, optional `bindings.headline` | 16 x 6 | Inline editable while static; supports page-state or latest/specific collection binding and content scaling |
| `text` | `value`, `fontSize`, optional `bindings.value`; optional `editable`, `textInputMode`, `inputType`, `fieldLabel`, `fieldKey`, `required`, placeholder and field styling | 8 x 4 | Display-only by default; can become a single-line or multiline runtime field while preserving binding, submission, and stable-ID behavior |
| `button` | `label`, optional `action`, submission/source settings, font/colors/padding/radius | 5 x 2 | Primary action block; supports no action, navigation, submission, URL, page-state updates, inline editing, and content scaling |
| `container` | background/border/radius/opacity | 12 x 8 | Layout primitive; top-level only; owns supported child blocks through `parentId` |
| `form` | title/description/submit/success labels, background/border/radius/padding | 16 x 10 | Functional schema-backed form surface; top-level only; owns supported field blocks through `parentId` |
| `shape` | `shapeType`, fill/border/radius/opacity | 6 x 4 | Shape type is chosen before insertion |
| `badge` | `text`, font/colors/border/radius/padding | 4 x 2 | Visual status/tag primitive |
| `icon` | `iconName`, `fontSize`, colors/radius, optional `action` | 2 x 2 | Uses the supported icon-name set; can navigate or open a safe URL |
| `checkbox` | `label`, `fieldKey`, `required`, `checked`, font and colors | 6 x 2 | Functional boolean field inside a `form` or when selected by a Submit Data button; visual mockup elsewhere |
| `toggle` | `label`, `fieldKey`, `required`, `checked`, font and colors | 6 x 2 | Functional boolean field inside a `form` or when selected by a Submit Data button; visual mockup elsewhere |
| `progressBar` | `label`, `value`, visibility and colors | 8 x 2 | Visual status primitive |
| `image` | `src`, `alt`, `fit`, focus, background/border/radius/opacity, optional `action` | 8 x 6 | Atomic image block; supports pasted/uploaded assets plus navigation or safe URL taps |
| `servicesList` | `title`, `items` | 16 x 6 | Existing business block; hidden from the preferred palette |
| `contactForm` | labels, field visibility, destination email | 16 x 8 | Functional submission block |
| `imageGallery` | `title`, `columns`, `images` | 16 x 6 | Existing business block; hidden from the preferred palette |

The exact defaults and constraints must be read from the registry rather than duplicated in feature logic.

Actions use a discriminated schema object in `props.action`. The `button` block may omit the action for static presentation or use `navigate`, `submitData`, `openUrl`, or `setPageState`. A `submitData` action owns an explicit `fields` list of stable block IDs and may include a stable project `collectionId`; collection writes map fields through optional `targetFieldKey` values. `setPageState` stores a target variable ID and a `RuntimeValueRef`; its current value sources are `static` and `formValue` for editable Text blocks. Only HTTP and HTTPS links are executable.

## Container Hierarchy Contract

- `Page.blocks` stays flat even when containers or forms are present.
- A child block references its owner through `parentId`.
- `container` and `form` are the current parent block types, and both remain top-level only.
- Nested parent blocks are not supported.
- Container and form children use relative `layout.grid` coordinates.
- `container` currently accepts lightweight child blocks including `button`, but not nested `container` or `form` blocks.
- `form` only accepts editable `text`, `checkbox`, and `toggle` children. Static Text may be placed in a Form for presentation, but only Text with `props.editable === true` is exposed as a submission field.
- A Submit Data `button` is not a Form child. It stays top-level or inside a Container and explicitly selects same-page fields in its `action.fields` list.
- Unsupported or orphaned child relationships are repaired at load time.

## Rendering Surfaces

Web rendering:

```text
Block
  -> shared/BlockRenderer.tsx
  -> shared/blocks/<BlockComponent>.tsx
```

Android rendering:

```text
Block JSON
  -> models/SchemaModels.kt
  -> renderers/BlockRenderer.kt
  -> renderers/<BlockView>.kt or PrimitiveViews.kt
```

Unknown web types return no component. Unknown Android types currently render no content. The frontend migration removes unsupported types when older projects load.

## Image Asset Storage

Image blocks store their render source in `props.src`.

Current source types:

- pasted remote URL
- backend-uploaded asset URL returned from `POST /projects/:id/assets/images`
- local data URL fallback when a real backend project ID is not available

The preferred production path is backend upload. The backend validates the file, writes the image bytes to Azure Blob Storage, and returns a URL. The project schema then stores that URL, not the raw image bytes.

## Schema Version And Migration

The current schema version is `6`.

`gridMigration.ts` performs these important load-time operations:

1. filters block types that are no longer in the registry
2. scales version-1 eight-column placements into the 16-column grid
3. assigns placements and render defaults when older blocks do not have them
4. repairs invalid container hierarchy data before the editor/runtime uses it
5. converts retired Nav Button and Submit Button records into the unified Button action schema
6. converts grouped submission fields into explicit button-owned field references
7. converts retired Input and Textarea records into editable Text records without changing block IDs

The backend, frontend, and Android loader all normalize saved projects to schema version `6`. The Input/Textarea conversion preserves block IDs so existing Button actions still reference the same runtime fields. Any future schema-version change must be implemented and tested across all three surfaces.

## Related

- [How to Add a Block](how-to-add-a-block.md)
- [Architecture](architecture.md)
- [Features](features.md)
