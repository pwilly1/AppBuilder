# Block and Schema Reference

Apptura stores projects as schema data so the web editor, web preview, and Android preview can render the same project. The canonical TypeScript definitions are in `app-builder/frontend/src/shared/schema/types.ts`.

## Project Schema

```ts
type Project = {
  schemaVersion: number
  id: string
  name: string
  pages: Page[]
}

type Page = {
  id: string
  title?: string
  path?: string
  blocks: Block[]
}

type Block = {
  id: string
  type: BlockType
  parentId?: string
  props: Record<string, any>
  layout?: BlockRuntimeLayout
  render?: BlockRenderMetadata
  editorPlacement?: BlockEditorPlacement
}
```

`editorPlacement` is transitional compatibility data. New runtime behavior should use `layout.grid`, `render`, and `props`.
`parentId` is ownership metadata for container children. Top-level blocks omit it.

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

`scaleContent` is currently meaningful for Hero, Text, and Nav Button. Other blocks resize their occupied/rendered area without using the text content-scale path.

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
| `hero` | `headline`, `headlineSize` | 16 x 6 | Inline editable; supports content scaling |
| `text` | `value`, `fontSize` | 8 x 4 | Inline editable; supports content scaling and row auto-growth |
| `navButton` | `label`, `toPageId`, font/colors/padding/radius | 4 x 2 | Inline editable; supports page navigation and content scaling |
| `submitButton` | `label`, `submitGroupId`, success message, font/colors/padding/radius | 5 x 2 | Inline editable; submits same-page grouped fields in web and Android preview |
| `container` | background/border/radius/opacity | 12 x 8 | Layout primitive; top-level only; owns supported child blocks through `parentId` |
| `form` | title/description/submit/success labels, background/border/radius/padding | 16 x 10 | Functional schema-backed form surface; top-level only; owns supported field blocks through `parentId` |
| `shape` | `shapeType`, fill/border/radius/opacity | 6 x 4 | Shape type is chosen before insertion |
| `badge` | `text`, font/colors/border/radius/padding | 4 x 2 | Visual status/tag primitive |
| `icon` | `iconName`, `fontSize`, colors/radius | 2 x 2 | Uses the project's supported icon-name set |
| `checkbox` | `label`, `fieldKey`, `submitGroupId`, `required`, `checked`, font and colors | 6 x 2 | Functional boolean field inside a `form` or when paired with a same-group `submitButton`; visual mockup elsewhere |
| `toggle` | `label`, `fieldKey`, `submitGroupId`, `required`, `checked`, font and colors | 6 x 2 | Functional boolean field inside a `form` or when paired with a same-group `submitButton`; visual mockup elsewhere |
| `progressBar` | `label`, `value`, visibility and colors | 8 x 2 | Visual status primitive |
| `input` | label/fieldKey/submitGroupId/value/placeholder/type/required/font/colors/radius | 8 x 3 | Functional text field inside a `form` or when paired with a same-group `submitButton`; visual mockup elsewhere |
| `textarea` | label/fieldKey/submitGroupId/value/placeholder/rows/required/font/colors/radius | 8 x 4 | Functional text field inside a `form` or when paired with a same-group `submitButton`; visual mockup elsewhere |
| `image` | `src`, `alt`, `fit`, focus, background/border/radius/opacity | 8 x 6 | Atomic image block; supports pasted URLs and backend-uploaded asset URLs |
| `servicesList` | `title`, `items` | 16 x 6 | Existing business block; hidden from the preferred palette |
| `contactForm` | labels, field visibility, destination email | 16 x 8 | Functional submission block |
| `imageGallery` | `title`, `columns`, `images` | 16 x 6 | Existing business block; hidden from the preferred palette |

The exact defaults and constraints must be read from the registry rather than duplicated in feature logic.

## Container Hierarchy Contract

- `Page.blocks` stays flat even when containers or forms are present.
- A child block references its owner through `parentId`.
- `container` and `form` are the current parent block types, and both remain top-level only.
- Nested parent blocks are not supported.
- Container and form children use relative `layout.grid` coordinates.
- `container` currently accepts lightweight child blocks including `submitButton`, but not nested `container` or `form` blocks.
- `form` only accepts `input`, `textarea`, `checkbox`, and `toggle` children.
- `submitButton` is not a Form child. It stays top-level or inside a Container and submits same-page fields with the same normalized `submitGroupId`.
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

The current schema version is `3`.

`gridMigration.ts` performs three important load-time operations:

1. filters block types that are no longer in the registry
2. scales version-1 eight-column placements into the 16-column grid
3. assigns placements and render defaults when older blocks do not have them
4. repairs invalid container hierarchy data before the editor/runtime uses it

The Android loader independently scales projects older than schema version `2`, while the shared frontend migration now also bumps projects to schema version `3` for container hierarchy support. Any future schema-version change must be implemented and tested on both surfaces.

## Related

- [How to Add a Block](how-to-add-a-block.md)
- [Architecture](architecture.md)
- [Features](features.md)
