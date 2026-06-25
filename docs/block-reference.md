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
| `container` | background/border/radius/opacity | 12 x 8 | Layout primitive; top-level only; owns supported child blocks through `parentId` |
| `shape` | `shapeType`, fill/border/radius/opacity | 6 x 4 | Shape type is chosen before insertion |
| `badge` | `text`, font/colors/border/radius/padding | 4 x 2 | Visual status/tag primitive |
| `icon` | `iconName`, `fontSize`, colors/radius | 2 x 2 | Uses the project's supported icon-name set |
| `checkbox` | `label`, `checked`, font and colors | 6 x 2 | Visual mockup control only |
| `toggle` | `label`, `checked`, font and colors | 6 x 2 | Visual mockup control only |
| `progressBar` | `label`, `value`, visibility and colors | 8 x 2 | Visual status primitive |
| `input` | label/value/placeholder/type/font/colors/radius | 8 x 3 | Visual mockup control only |
| `textarea` | label/value/placeholder/rows/font/colors/radius | 8 x 4 | Visual mockup control only |
| `servicesList` | `title`, `items` | 16 x 6 | Existing business block; hidden from the preferred palette |
| `contactForm` | labels, field visibility, destination email | 16 x 8 | Functional submission block |
| `imageGallery` | `title`, `columns`, `images` | 16 x 6 | Existing business block; hidden from the preferred palette |

The exact defaults and constraints must be read from the registry rather than duplicated in feature logic.

## Container Hierarchy Contract

- `Page.blocks` stays flat even when containers are present.
- A child block references its owner through `parentId`.
- Containers cannot have `parentId` in the current implementation.
- Nested containers are not supported.
- Container children use relative `layout.grid` coordinates.
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
