// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.layout

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.GridPlacement

const val GRID_COLUMN_COUNT = 8
val GRID_ROW_HEIGHT: Dp = 56.dp
val GRID_GAP: Dp = 0.dp
val GRID_PADDING: Dp = 16.dp
val GRID_CANVAS_WIDTH: Dp = 390.dp

data class GridMetrics(
    val canvasWidth: Dp,
    val columnCount: Int = GRID_COLUMN_COUNT,
    val rowHeight: Dp = GRID_ROW_HEIGHT,
    val gap: Dp = GRID_GAP,
    val paddingX: Dp = GRID_PADDING,
    val paddingY: Dp = GRID_PADDING,
)

data class GridRect(
    val left: Dp,
    val top: Dp,
    val width: Dp,
    val height: Dp,
)

fun getColumnWidth(metrics: GridMetrics): Dp {
    val usableWidth = metrics.canvasWidth - metrics.paddingX * 2 - metrics.gap * (metrics.columnCount - 1)
    return usableWidth / metrics.columnCount
}

fun getPlacementRect(placement: GridPlacement, metrics: GridMetrics): GridRect {
    val columnWidth = getColumnWidth(metrics)
    return GridRect(
        left = metrics.paddingX + (columnWidth + metrics.gap) * (placement.colStart - 1).toFloat(),
        top = metrics.paddingY + (metrics.rowHeight + metrics.gap) * (placement.rowStart - 1).toFloat(),
        width = columnWidth * placement.colSpan.toFloat() + metrics.gap * (placement.colSpan - 1).toFloat(),
        height = metrics.rowHeight * placement.rowSpan.toFloat() + metrics.gap * (placement.rowSpan - 1).toFloat(),
    )
}

fun getGridRowCount(blocks: List<Block>): Int {
    return blocks.fold(0) { maxRow, block ->
        val placement = block.layout?.grid ?: return@fold maxRow
        maxOf(maxRow, placement.rowStart + placement.rowSpan - 1)
    }
}

fun resolveBlockRenderRect(block: Block, metrics: GridMetrics): GridRect? {
    val placement = block.layout?.grid ?: return null
    val placementRect = getPlacementRect(placement, metrics)
    val render = block.render
    val width = minDp(render?.widthPx?.dp ?: placementRect.width, placementRect.width)
    val height = minDp(render?.heightPx?.dp ?: placementRect.height, placementRect.height)
    val left = placementRect.left + alignOffset(placementRect.width, width, render?.alignX) + (render?.offsetX?.dp ?: 0.dp)
    val top = placementRect.top + alignOffset(placementRect.height, height, render?.alignY) + (render?.offsetY?.dp ?: 0.dp)
    val maxLeft = placementRect.left + (placementRect.width - width)
    val maxTop = placementRect.top + (placementRect.height - height)

    return GridRect(
        left = clampDp(left, placementRect.left, maxLeft),
        top = clampDp(top, placementRect.top, maxTop),
        width = width,
        height = height,
    )
}

private fun alignOffset(containerSize: Dp, contentSize: Dp, align: String?): Dp {
    val freeSpace = maxOf(0.dp, containerSize - contentSize)
    return when (align) {
        "start" -> 0.dp
        "end" -> freeSpace
        else -> freeSpace / 2
    }
}

private fun clampDp(value: Dp, min: Dp, max: Dp): Dp {
    return maxOf(min, minOf(value, max))
}

private fun minDp(a: Dp, b: Dp): Dp {
    return if (a <= b) a else b
}
