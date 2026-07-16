// © 2025 Preston Willis. All rights reserved.
import type { Page, Block, BlockGridConstraints, GridPlacement } from '../shared/schema/types'
import {
  clampSpan,
  collidesWithBlocks,
  derivePlacementFromPixelRect,
  getBlockGridConstraints,
  getColumnWidth,
  GRID_DEFAULT_ROW_COUNT,
  getPlacementRect,
  GRID_COLUMN_COUNT,
  GRID_GAP,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  normalizePlacement,
  resolveBlockRenderRect,
  type GridMetrics,
} from '../shared/schema/gridLayout'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { DraggableBlock } from './DraggableBlock'
import { BlockRenderer } from '../shared/BlockRenderer'
import { createPageRuntimeContext, type RuntimeContext } from '../shared/runtime/runtimeBindings'
import { BLOCK_DRAG_DATA_TYPE, getActiveDraggedBlock, getDraggedBlockFromDataTransfer } from './blockDrag'
import { collectAllFieldValues, collectFieldValues, FormRuntimeProvider, type FormValue } from '../shared/blocks/formRuntime'
import {
  buildBlockHierarchyIndex,
  canBlockBeContainerChild,
  isContainerBlock,
  isPlacementWithinPlacement,
  pageToContainerPlacement,
} from '../shared/schema/blockHierarchy'

const DEFAULT_PHONE_GRID_ROWS = GRID_DEFAULT_ROW_COUNT

type GridPreview = {
  blockId: string
  placement: GridPlacement
  rect: ReturnType<typeof getPlacementRect>
  valid: boolean
}

type ContainerChildrenLayerProps = {
  container: Block
  childrenBlocks: Block[]
  childGridMetrics: GridMetrics
  selectedBlockId?: string
  isActiveContainer: boolean
  previewMode?: boolean
  projectId?: string
  runtimeContext: RuntimeContext
  onSetPageState: (variableId: string, value: string) => void
  onNavigate?: (pageId: string) => void
  onSelectBlock?: (b: Block | null) => void
  onUpdateBlock?: (b: Block) => void
  onDetachBlockFromContainer?: (block: Block, placement: GridPlacement) => void
  pageGridMetrics: GridMetrics
  pageRowCount: number
  topLevelBlocks: Block[]
}

export function PageRenderer({
  page,
  projectId,
  selectedBlockId,
  activeContainerId,
  previewMode,
  onNavigate,
  onSelectBlock,
  onEnterContainer,
  onExitContainer,
  onReorder: _onReorder,
  onUpdateBlock,
  onDetachBlockFromContainer,
  onDropNewBlock,
}: {
  page: Page
  projectId?: string
  selectedBlockId?: string
  activeContainerId?: string | null
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  onSelectBlock?: (b: Block | null) => void
  onEnterContainer?: (b: Block) => void
  onExitContainer?: () => void
  onReorder?: (newBlocks: Block[]) => void
  onUpdateBlock?: (b: Block) => void
  onDetachBlockFromContainer?: (block: Block, placement: GridPlacement) => void
  onDropNewBlock?: (block: Block, placement: GridPlacement, parentId?: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showHGuide, setShowHGuide] = useState(false)
  const [showVGuide, setShowVGuide] = useState(false)
  const [isDragTargeting, setIsDragTargeting] = useState(false)
  const [gridPreview, setGridPreview] = useState<GridPreview | null>(null)
  const [newBlockPreview, setNewBlockPreview] = useState<GridPreview | null>(null)
  const [screenWidth, setScreenWidth] = useState(390)
  const [fieldValuesByBlockId, setFieldValuesByBlockId] = useState<Record<string, FormValue>>({})
  const [fieldKeysByBlockId, setFieldKeysByBlockId] = useState<Record<string, string>>({})
  const pageStateVariables = page.stateVariables
  const initialPageState = useMemo(
    () => createPageRuntimeContext({ stateVariables: pageStateVariables }).pageState,
    [pageStateVariables],
  )
  const [pageState, setPageState] = useState<Record<string, string>>(() => initialPageState)
  const runtimeContext = useMemo<RuntimeContext>(() => ({ pageState }), [pageState])
  const pageStateVariableIds = useMemo(
    () => new Set((pageStateVariables || []).map((variable) => variable.id)),
    [pageStateVariables],
  )
  const handleSetPageState = useCallback((variableId: string, value: string) => {
    if (!pageStateVariableIds.has(variableId)) return
    setPageState((current) => ({ ...current, [variableId]: value }))
  }, [pageStateVariableIds])

  useEffect(() => {
    setPageState(initialPageState)
  }, [page.id, initialPageState])

  useEffect(() => {
    setIsDragTargeting(false)
    setGridPreview(null)
    setNewBlockPreview(null)
    setShowHGuide(false)
    setShowVGuide(false)
    setFieldValuesByBlockId({})
    setFieldKeysByBlockId({})
  }, [page.id, page.blocks.length])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = () => {
      const nextWidth = Math.max(320, Math.round(node.clientWidth))
      setScreenWidth((current) => (current === nextWidth ? current : nextWidth))
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const gridRowCount = DEFAULT_PHONE_GRID_ROWS

  const gridCellCount = gridRowCount * GRID_COLUMN_COUNT
  const gridHeight = gridRowCount * GRID_ROW_HEIGHT + Math.max(0, gridRowCount - 1) * GRID_GAP
  const phoneScreenHeight = gridHeight + GRID_PADDING * 2
  const gridTopInset = Math.max(0, Math.round((phoneScreenHeight - gridHeight) / 2))
  const gridMetrics = useMemo(
    () => ({
      canvasWidth: screenWidth,
      columnCount: GRID_COLUMN_COUNT,
      rowHeight: GRID_ROW_HEIGHT,
      gap: GRID_GAP,
      paddingX: GRID_PADDING,
      paddingY: gridTopInset,
    }),
    [screenWidth, gridTopInset],
  )
  const editorBlocks = useMemo(
    () =>
      page.blocks.map((block) => {
        const placement = block.layout?.grid
        if (!placement) return block
        const parent = block.parentId ? page.blocks.find((candidate) => candidate.id === block.parentId) : null
        const parentPlacement = parent?.layout?.grid

        const normalizedGrid = normalizePlacement(
          placement,
          getBlockGridConstraints(block),
          parentPlacement ? parentPlacement.colSpan : GRID_COLUMN_COUNT,
          parentPlacement ? parentPlacement.rowSpan : gridRowCount,
        )

        if (
          normalizedGrid.colStart === placement.colStart &&
          normalizedGrid.rowStart === placement.rowStart &&
          normalizedGrid.colSpan === placement.colSpan &&
          normalizedGrid.rowSpan === placement.rowSpan
        ) {
          return block
        }

        return {
          ...block,
          layout: {
            ...(block.layout || {}),
            grid: normalizedGrid,
          },
        }
      }),
    [page.blocks, gridRowCount],
  )

  const hierarchy = useMemo(() => buildBlockHierarchyIndex(editorBlocks), [editorBlocks])
  const topLevelBlocks = useMemo(
    () =>
      editorBlocks.filter((block) => {
        if (!block.parentId) return true
        const parent = hierarchy.byId.get(block.parentId)
        return !parent || !isContainerBlock(parent)
      }),
    [editorBlocks, hierarchy],
  )

  function renderContainerChildren(container: Block) {
    const containerPlacement = container.layout?.grid
    if (!containerPlacement) return null
    const children = hierarchy.childrenByParentId.get(container.id) ?? []

    const containerRect = getContainerRect(container)
    const childGridMetrics = {
      ...gridMetrics,
      canvasWidth: containerRect.width,
      columnCount: containerPlacement.colSpan,
      rowHeight: containerRect.height / Math.max(1, containerPlacement.rowSpan),
      paddingX: 0,
      paddingY: 0,
    }

    const isActiveContainer = activeContainerId === container.id

    return (
      <ContainerChildrenLayer
        container={container}
        childrenBlocks={children}
        childGridMetrics={childGridMetrics}
        selectedBlockId={selectedBlockId}
        isActiveContainer={isActiveContainer}
        previewMode={previewMode}
        projectId={projectId}
        runtimeContext={runtimeContext}
        onSetPageState={handleSetPageState}
        onNavigate={onNavigate}
        onSelectBlock={onSelectBlock}
        onUpdateBlock={onUpdateBlock}
        onDetachBlockFromContainer={onDetachBlockFromContainer}
        pageGridMetrics={gridMetrics}
        pageRowCount={gridRowCount}
        topLevelBlocks={topLevelBlocks}
      />
    )
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedBlock(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragTargeting(true)
    updateNewBlockPreview(event)
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedBlock(event.dataTransfer)) return
    event.preventDefault()
    setIsDragTargeting(false)
    setNewBlockPreview(null)

    const draggedBlock = getDraggedBlockFromDataTransfer(event.dataTransfer)
    const node = containerRef.current
    if (!draggedBlock || !node || !onDropNewBlock) return

    const bounds = node.getBoundingClientRect()
    const localPoint = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
    const containerTarget = getDropContainerTarget(localPoint, draggedBlock)

    if (containerTarget) {
      const { container, rect } = containerTarget
      const containerPlacement = container.layout?.grid
      if (!containerPlacement) return

      const childMetrics: GridMetrics = {
        ...gridMetrics,
        canvasWidth: rect.width,
        columnCount: containerPlacement.colSpan,
        rowHeight: rect.height / Math.max(1, containerPlacement.rowSpan),
        paddingX: 0,
        paddingY: 0,
      }
      const placement = derivePlacementFromDropPoint(
        draggedBlock,
        {
          x: localPoint.x - rect.left,
          y: localPoint.y - rect.top,
        },
        childMetrics,
        containerPlacement.colSpan,
        containerPlacement.rowSpan,
      )
      const siblings = hierarchy.childrenByParentId.get(container.id) ?? []
      if (collidesWithBlocks(placement, siblings)) return
      onDropNewBlock(draggedBlock, placement, container.id)
      return
    }

    const placement = derivePlacementFromDropPoint(draggedBlock, localPoint, gridMetrics, GRID_COLUMN_COUNT, gridRowCount)
    if (collidesWithBlocks(placement, topLevelBlocks)) return
    onDropNewBlock(draggedBlock, placement)
  }

  function updateNewBlockPreview(event: DragEvent<HTMLDivElement>) {
    const draggedBlock = getDraggedBlockFromDataTransfer(event.dataTransfer)
    const node = containerRef.current
    if (!draggedBlock || !node) {
      setNewBlockPreview(null)
      return
    }

    const bounds = node.getBoundingClientRect()
    const localPoint = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
    const containerTarget = getDropContainerTarget(localPoint, draggedBlock)

    if (containerTarget) {
      const { container, rect: containerRect } = containerTarget
      const containerPlacement = container.layout?.grid
      if (!containerPlacement) {
        setNewBlockPreview(null)
        return
      }

      const childMetrics: GridMetrics = {
        ...gridMetrics,
        canvasWidth: containerRect.width,
        columnCount: containerPlacement.colSpan,
        rowHeight: containerRect.height / Math.max(1, containerPlacement.rowSpan),
        paddingX: 0,
        paddingY: 0,
      }
      const placement = derivePlacementFromDropPoint(
        draggedBlock,
        {
          x: localPoint.x - containerRect.left,
          y: localPoint.y - containerRect.top,
        },
        childMetrics,
        containerPlacement.colSpan,
        containerPlacement.rowSpan,
      )
      const localRect = getPlacementRect(placement, childMetrics)
      const valid = !collidesWithBlocks(placement, hierarchy.childrenByParentId.get(container.id) ?? [])

      setNewBlockPreview({
        blockId: draggedBlock.id,
        placement,
        rect: {
          ...localRect,
          left: localRect.left + containerRect.left,
          top: localRect.top + containerRect.top,
        },
        valid,
      })
      return
    }

    const placement = derivePlacementFromDropPoint(draggedBlock, localPoint, gridMetrics, GRID_COLUMN_COUNT, gridRowCount)
    const rect = getPlacementRect(placement, gridMetrics)
    setNewBlockPreview({
      blockId: draggedBlock.id,
      placement,
      rect,
      valid: !collidesWithBlocks(placement, topLevelBlocks),
    })
  }

  function getDropContainerTarget(point: { x: number; y: number }, block: Block) {
    if (isContainerBlock(block)) return null

    const containers = topLevelBlocks.filter((candidate) => isContainerBlock(candidate))
    for (let index = containers.length - 1; index >= 0; index -= 1) {
      const container = containers[index]
      if (!canBlockBeContainerChild(block, container)) continue
      const placement = container.layout?.grid
      if (!placement) continue
      const rect = getContainerRect(container)
      if (isPointInRect(point, rect)) return { container, rect }
    }

    return null
  }

  function getContainerRect(container: Block) {
    const placement = container.layout?.grid
    if (!placement) return { left: 0, top: 0, width: 0, height: 0 }
    return resolveBlockRenderRect(container, gridMetrics) ?? getPlacementRect(placement, gridMetrics)
  }

  function handleGridPreviewChange(next: { blockId: string; left: number; top: number; width: number; height: number } | null) {
    if (!next) {
      setGridPreview(null)
      return
    }

    const block = topLevelBlocks.find((entry) => entry.id === next.blockId)
    if (!block) {
      setGridPreview(null)
      return
    }

    const placement = derivePlacementFromPixelRect(
      {
        left: next.left,
        top: next.top,
        width: next.width,
        height: next.height,
      },
      gridMetrics,
      getBlockGridConstraints(block),
      GRID_COLUMN_COUNT,
      gridRowCount,
    )

    const rect = getPlacementRect(placement, gridMetrics)
    const activeContainer = activeContainerId ? hierarchy.byId.get(activeContainerId) : null
    const activeContainerPlacement = activeContainer?.layout?.grid
    const canConsiderAttach =
      activeContainer &&
      activeContainerPlacement &&
      !block.parentId &&
      block.id !== activeContainer.id &&
      canBlockBeContainerChild(block, activeContainer)
    const relativePlacement = canConsiderAttach ? pageToContainerPlacement(placement, activeContainerPlacement) : null
    const canAttachToActiveContainer = Boolean(
      canConsiderAttach &&
        relativePlacement &&
        isPlacementWithinPlacement(relativePlacement, activeContainerPlacement) &&
        !collidesWithBlocks(relativePlacement, hierarchy.childrenByParentId.get(activeContainer.id) ?? []),
    )

    setGridPreview({
      blockId: next.blockId,
      placement,
      rect,
      valid: canAttachToActiveContainer || !collidesWithBlocks(placement, topLevelBlocks, next.blockId),
    })
  }

  const activeGridPreview = gridPreview ?? newBlockPreview

  function setFieldValue(fieldKey: string, value: FormValue, fieldBlockId?: string) {
    const stableBlockId = fieldBlockId || fieldKey
    setFieldValuesByBlockId((current) => ({ ...current, [stableBlockId]: value }))
    setFieldKeysByBlockId((current) => ({ ...current, [stableBlockId]: fieldKey }))
  }

  return (
    <FormRuntimeProvider value={{
      fieldValuesByBlockId,
      fieldKeysByBlockId,
      setValue: setFieldValue,
      getFieldValue: (fieldBlockId) => fieldValuesByBlockId[fieldBlockId],
      getFieldValues: (fields) => collectFieldValues(fields, fieldValuesByBlockId),
      getAllValues: () => collectAllFieldValues(fieldValuesByBlockId, fieldKeysByBlockId),
      previewMode,
    }}>
      <div className="editor-stage px-3 py-3">
      <div className="mx-auto flex w-full justify-center">
        <div className="phone-frame shadow-sm" style={{ height: phoneScreenHeight }}>
          <div
            ref={containerRef}
            className="phone-screen"
            style={{ minHeight: 640, touchAction: previewMode ? 'auto' : 'none' }}
            onDragEnter={
              previewMode
                ? undefined
                : (event) => {
                    if (!hasDraggedBlock(event.dataTransfer)) return
                    setIsDragTargeting(true)
                  }
            }
            onDragLeave={
              previewMode
                ? undefined
                : (event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                    setIsDragTargeting(false)
                    setNewBlockPreview(null)
                  }
            }
            onDragOver={previewMode ? undefined : handleCanvasDragOver}
            onDrop={previewMode ? undefined : handleCanvasDrop}
            onPointerDown={
              previewMode
                ? undefined
                : (event) => {
                    if (event.target !== event.currentTarget) return
                    setIsDragTargeting(false)
                    setGridPreview(null)
                    setNewBlockPreview(null)
                    onExitContainer?.()
                    onSelectBlock?.(null)
                  }
            }
          >
            {!previewMode ? (
              <div
                className={`editor-grid-overlay ${isDragTargeting ? 'editor-grid-overlay-active' : ''}`}
                style={{
                  top: gridTopInset,
                  left: GRID_PADDING,
                  right: GRID_PADDING,
                  height: gridHeight,
                  gridTemplateColumns: `repeat(${GRID_COLUMN_COUNT}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridRowCount}, ${GRID_ROW_HEIGHT}px)`,
                  gap: GRID_GAP,
                }}
              >
                {Array.from({ length: gridCellCount }, (_, index) => (
                  <div key={`grid-cell-${index}`} className="editor-grid-cell" />
                ))}
              </div>
            ) : null}
            {!previewMode && activeGridPreview ? (
              <div
                className={`editor-grid-preview ${activeGridPreview.valid ? '' : 'editor-grid-preview-invalid'}`}
                style={activeGridPreview.rect}
              >
                <span className="editor-grid-preview-label">
                  {`${activeGridPreview.placement.colSpan} x ${activeGridPreview.placement.rowSpan}`}
                  {!activeGridPreview.valid ? ' blocked' : ''}
                </span>
              </div>
            ) : null}
            {!previewMode && showHGuide ? (
              <div className="absolute left-0 right-0 border-t border-dashed border-sky-400" style={{ top: '50%' }} />
            ) : null}
            {!previewMode && showVGuide ? (
              <div className="absolute top-0 bottom-0 border-l border-dashed border-sky-400" style={{ left: '50%' }} />
            ) : null}

            {topLevelBlocks.map((block, index) => (
              <DraggableBlock
                key={block.id}
                block={block}
                isActive={selectedBlockId === block.id}
                projectId={projectId}
                index={index}
                containerRef={containerRef}
                gridMetrics={gridMetrics}
                previewMode={previewMode}
                runtimeContext={runtimeContext}
                onSetPageState={handleSetPageState}
                onNavigate={onNavigate}
                onEnterContainer={previewMode ? undefined : onEnterContainer}
                onDragStateChange={previewMode ? undefined : setIsDragTargeting}
                onGridPreviewChange={previewMode ? undefined : handleGridPreviewChange}
                dropPreviewValid={gridPreview?.blockId === block.id ? gridPreview.valid : undefined}
                dropPreviewPlacement={gridPreview?.blockId === block.id ? gridPreview.placement : block.layout?.grid}
                onSelect={previewMode ? undefined : onSelectBlock}
                onUpdate={previewMode ? undefined : onUpdateBlock}
                onSnapChange={({ h, v }) => {
                  if (previewMode) return
                  setShowHGuide(h)
                  setShowVGuide(v)
                }}
              >
                {isContainerBlock(block) ? renderContainerChildren(block) : null}
              </DraggableBlock>
            ))}
          </div>
        </div>
      </div>
      </div>
    </FormRuntimeProvider>
  )
}

function hasDraggedBlock(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(BLOCK_DRAG_DATA_TYPE) || Boolean(getActiveDraggedBlock())
}

function isPointInRect(point: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }) {
  return point.x >= rect.left && point.x <= rect.left + rect.width && point.y >= rect.top && point.y <= rect.top + rect.height
}

function derivePlacementFromDropPoint(
  block: Block,
  point: { x: number; y: number },
  metrics: GridMetrics,
  columnCount: number,
  rowCount: number,
): GridPlacement {
  const constraints = getScopedConstraints(getBlockGridConstraints(block), columnCount, rowCount)
  const span = clampSpan(constraints.defaultSpan, constraints)
  const columnWidth = getColumnWidth(metrics)
  const gap = metrics.gap ?? GRID_GAP
  const rowHeight = metrics.rowHeight ?? GRID_ROW_HEIGHT
  const paddingX = metrics.paddingX ?? metrics.padding ?? GRID_PADDING
  const paddingY = metrics.paddingY ?? metrics.padding ?? GRID_PADDING
  const rawColStart = Math.floor((point.x - paddingX) / Math.max(1, columnWidth + gap)) + 1
  const rawRowStart = Math.floor((point.y - paddingY) / Math.max(1, rowHeight + gap)) + 1

  return normalizePlacement(
    {
      colStart: rawColStart,
      rowStart: rawRowStart,
      colSpan: span.cols,
      rowSpan: span.rows,
    },
    constraints,
    columnCount,
    rowCount,
  )
}

function getScopedConstraints(
  constraints: BlockGridConstraints,
  columnCount: number,
  rowCount: number,
): BlockGridConstraints {
  const maxCols = Math.max(1, columnCount)
  const maxRows = Math.max(1, rowCount)
  const defaultCols = Math.min(constraints.defaultSpan.cols, maxCols)
  const defaultRows = Math.min(constraints.defaultSpan.rows, maxRows)

  return {
    ...constraints,
    defaultSpan: {
      cols: Math.max(1, defaultCols),
      rows: Math.max(1, defaultRows),
    },
    minSpan: {
      cols: Math.min(constraints.minSpan.cols, Math.max(1, defaultCols)),
      rows: Math.min(constraints.minSpan.rows, Math.max(1, defaultRows)),
    },
    maxSpan: {
      cols: Math.min(constraints.maxSpan.cols, maxCols),
      rows: Math.min(constraints.maxSpan.rows, maxRows),
    },
  }
}

function ContainerChildrenLayer({
  container,
  childrenBlocks,
  childGridMetrics,
  selectedBlockId,
  isActiveContainer,
  previewMode,
  projectId,
  runtimeContext,
  onSetPageState,
  onNavigate,
  onSelectBlock,
  onUpdateBlock,
  onDetachBlockFromContainer,
  pageGridMetrics,
  pageRowCount,
  topLevelBlocks,
}: ContainerChildrenLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [childGridPreview, setChildGridPreview] = useState<GridPreview | null>(null)
  const [childDetachPreview, setChildDetachPreview] = useState<GridPreview | null>(null)
  const [childDragActive, setChildDragActive] = useState(false)
  const containerPlacement = container.layout?.grid
  const childRowHeight = childGridMetrics.rowHeight ?? GRID_ROW_HEIGHT

  useEffect(() => {
    setChildGridPreview(null)
    setChildDetachPreview(null)
    setChildDragActive(false)
  }, [container.id, childrenBlocks.length])

  function handleChildGridPreviewChange(next: { blockId: string; left: number; top: number; width: number; height: number } | null) {
    if (!next || !containerPlacement) {
      setChildGridPreview(null)
      setChildDetachPreview(null)
      return
    }

    const block = childrenBlocks.find((entry) => entry.id === next.blockId)
    if (!block) {
      setChildGridPreview(null)
      return
    }

    const childLayerWidth = childGridMetrics.canvasWidth
    const childLayerHeight = containerPlacement.rowSpan * childRowHeight
    const outsideContainer =
      next.left < 0 ||
      next.top < 0 ||
      next.left + next.width > childLayerWidth ||
      next.top + next.height > childLayerHeight

    if (outsideContainer) {
      const containerPageRect = getPlacementRect(containerPlacement, pageGridMetrics)
      const pagePlacement = derivePlacementFromPixelRect(
        {
          left: containerPageRect.left + next.left,
          top: containerPageRect.top + next.top,
          width: next.width,
          height: next.height,
        },
        pageGridMetrics,
        getBlockGridConstraints(block),
        GRID_COLUMN_COUNT,
        pageRowCount,
      )
      const pageRect = getPlacementRect(pagePlacement, pageGridMetrics)
      const valid = !collidesWithBlocks(pagePlacement, topLevelBlocks)

      setChildGridPreview(null)
      setChildDetachPreview({
        blockId: next.blockId,
        placement: pagePlacement,
        rect: {
          ...pageRect,
          left: pageRect.left - containerPageRect.left,
          top: pageRect.top - containerPageRect.top,
        },
        valid,
      })
      return
    }

    const placement = derivePlacementFromPixelRect(
      {
        left: next.left,
        top: next.top,
        width: next.width,
        height: next.height,
      },
      childGridMetrics,
      getBlockGridConstraints(block),
      containerPlacement.colSpan,
      containerPlacement.rowSpan,
    )
    const rect = getPlacementRect(placement, childGridMetrics)
    const valid = !collidesWithBlocks(placement, childrenBlocks, next.blockId)

    setChildGridPreview({
      blockId: next.blockId,
      placement,
      rect,
      valid,
    })
    setChildDetachPreview(null)
  }

  if (!isActiveContainer || previewMode) {
    return (
      <div className="absolute inset-0">
        {childrenBlocks.map((child) => {
          const childPlacement = child.layout?.grid
          if (!childPlacement) return null
          const childRect = getPlacementRect(childPlacement, childGridMetrics)

          return (
            <div
              key={child.id}
              style={{
                position: 'absolute',
                left: childRect.left,
                top: childRect.top,
                width: childRect.width,
                height: childRect.height,
              }}
            >
              <BlockRenderer
                block={child}
                projectId={projectId}
                previewMode={previewMode}
                runtimeContext={runtimeContext}
                onSetPageState={onSetPageState}
                onNavigate={previewMode ? onNavigate : undefined}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return
        event.stopPropagation()
        onSelectBlock?.(container)
      }}
    >
      <div
        className={`editor-grid-overlay ${childDragActive ? 'editor-grid-overlay-active' : ''}`}
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: (containerPlacement?.rowSpan ?? 1) * childRowHeight,
          gridTemplateColumns: `repeat(${containerPlacement?.colSpan ?? 1}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${containerPlacement?.rowSpan ?? 1}, ${childRowHeight}px)`,
          gap: GRID_GAP,
        }}
      >
        {Array.from({ length: (containerPlacement?.colSpan ?? 1) * (containerPlacement?.rowSpan ?? 1) }, (_, index) => (
          <div key={`container-grid-cell-${container.id}-${index}`} className="editor-grid-cell" />
        ))}
      </div>

      {(childGridPreview ?? childDetachPreview) ? (
        <div
          className={`editor-grid-preview ${(childGridPreview ?? childDetachPreview)!.valid ? '' : 'editor-grid-preview-invalid'}`}
          style={(childGridPreview ?? childDetachPreview)!.rect}
        >
          <span className="editor-grid-preview-label">
            {`${(childGridPreview ?? childDetachPreview)!.placement.colSpan} x ${(childGridPreview ?? childDetachPreview)!.placement.rowSpan}`}
            {childDetachPreview?.blockId === (childGridPreview ?? childDetachPreview)!.blockId && (childGridPreview ?? childDetachPreview)!.valid
              ? ' move to page'
              : !(childGridPreview ?? childDetachPreview)!.valid
              ? ' blocked'
              : ''}
          </span>
        </div>
      ) : null}

      {!childrenBlocks.length && container.type !== 'form' ? (
        <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border border-dashed border-blue-300/70 bg-blue-50/45 text-center text-xs font-semibold text-blue-700">
          Drop blocks here or click a block in the sidebar
        </div>
      ) : null}

      {childrenBlocks.map((child, index) => (
        <DraggableBlock
          key={child.id}
          block={child}
          isActive={selectedBlockId === child.id}
          projectId={projectId}
          index={index}
          containerRef={layerRef}
          gridMetrics={childGridMetrics}
          previewMode={false}
          runtimeContext={runtimeContext}
          onSetPageState={onSetPageState}
          onNavigate={onNavigate}
          onDragStateChange={setChildDragActive}
          onGridPreviewChange={handleChildGridPreviewChange}
          dropPreviewValid={
            childDetachPreview?.blockId === child.id
              ? childDetachPreview.valid
              : childGridPreview?.blockId === child.id
              ? childGridPreview.valid
              : undefined
          }
          dropPreviewPlacement={childGridPreview?.blockId === child.id ? childGridPreview.placement : child.layout?.grid}
          onSelect={(block) => onSelectBlock?.(block)}
          onUpdate={(nextBlock) => {
            if (childDetachPreview?.blockId === child.id && childDetachPreview.valid) {
              onDetachBlockFromContainer?.(nextBlock, childDetachPreview.placement)
              setChildDetachPreview(null)
              return
            }
            onUpdateBlock?.(nextBlock)
          }}
          onSnapChange={() => {}}
          allowDragOutsideBounds
        />
      ))}
    </div>
  )
}


