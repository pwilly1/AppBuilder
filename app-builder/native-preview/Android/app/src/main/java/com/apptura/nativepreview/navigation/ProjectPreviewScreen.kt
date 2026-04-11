// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.navigation

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.layout.GRID_GAP
import com.apptura.nativepreview.layout.GRID_PADDING
import com.apptura.nativepreview.layout.GRID_ROW_HEIGHT
import com.apptura.nativepreview.layout.GridMetrics
import com.apptura.nativepreview.layout.getColumnWidth
import com.apptura.nativepreview.layout.getGridRowCount
import com.apptura.nativepreview.layout.resolveBlockRenderRect
import com.apptura.nativepreview.models.Project
import com.apptura.nativepreview.renderers.BlockRenderer

@Composable
fun ProjectPreviewScreen(project: Project, baseUrl: String, onExit: () -> Unit = {}) {
    val pageIndex = remember { mutableStateOf(0) }
    val pages = project.pages

    if (pages.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text("No pages in project")
        }
    } else {
        val page = pages[pageIndex.value]
        val gridBlocks = page.blocks.filter { it.layout?.grid != null }
        val legacyBlocks = page.blocks.filter { it.layout?.grid == null }
        val scroll = rememberScrollState()

        Box(modifier = Modifier.fillMaxSize()) {
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scroll)
            ) {
                val canvasWidth = maxWidth
                val metrics = GridMetrics(canvasWidth = canvasWidth)
                val gridRowCount = maxOf(1, getGridRowCount(gridBlocks))
                val rowContentHeight = GRID_ROW_HEIGHT * gridRowCount.toFloat() +
                    GRID_GAP * (gridRowCount - 1).toFloat() +
                    GRID_PADDING * 2f
                val renderBottom = gridBlocks.fold(0.dp) { currentMax, block ->
                    val rect = resolveBlockRenderRect(block, metrics)
                    val bottom = if (rect == null) 0.dp else rect.top + rect.height + GRID_PADDING
                    if (bottom > currentMax) bottom else currentMax
                }
                val contentHeight = if (renderBottom > rowContentHeight) renderBottom else rowContentHeight
                val gridHeight = if (contentHeight > 640.dp) contentHeight else 640.dp

                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .width(canvasWidth)
                            .height(gridHeight)
                    ) {
                        GridDebugOverlay(
                            modifier = Modifier.matchParentSize(),
                            metrics = metrics,
                            rowCount = gridRowCount,
                        )

                        gridBlocks.forEach { block ->
                            val rect = resolveBlockRenderRect(block, metrics) ?: return@forEach
                            Box(
                                modifier = Modifier
                                    .offset(x = rect.left, y = rect.top)
                                    .width(rect.width)
                                    .height(rect.height)
                                    .clipToBounds()
                            ) {
                                BlockRenderer(block, projectId = project.id, baseUrl = baseUrl) { targetPageId ->
                                    val idx = pages.indexOfFirst { it.id == targetPageId }
                                    if (idx >= 0) pageIndex.value = idx
                                }
                            }
                        }
                    }

                    if (legacyBlocks.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Column(
                            modifier = Modifier
                                .width(canvasWidth)
                        ) {
                            legacyBlocks.forEach { block ->
                                BlockRenderer(block, projectId = project.id, baseUrl = baseUrl) { targetPageId ->
                                    val idx = pages.indexOfFirst { it.id == targetPageId }
                                    if (idx >= 0) pageIndex.value = idx
                                }
                            }
                        }
                    }
                }
            }

            IconButton(
                onClick = onExit,
                modifier = Modifier
                    .statusBarsPadding()
                    .padding(12.dp)
                    .align(Alignment.TopStart)
                    .background(Color(0xCCFFFFFF), CircleShape)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Exit preview",
                    tint = Color(0xFF0F172A),
                )
            }
        }
    }
}

@Composable
private fun GridDebugOverlay(
    modifier: Modifier,
    metrics: GridMetrics,
    rowCount: Int,
) {
    Canvas(modifier = modifier) {
        val stroke = 1.dp.toPx()
        val lineColor = Color(0xFF93C5FD).copy(alpha = 0.25f)
        val columnWidth = getColumnWidth(metrics).toPx()
        val gapPx = metrics.gap.toPx()
        val paddingX = metrics.paddingX.toPx()
        val paddingY = metrics.paddingY.toPx()
        val rowHeight = metrics.rowHeight.toPx()

        for (column in 0..metrics.columnCount) {
            val x = paddingX + column * (columnWidth + gapPx)
            drawLine(
                color = lineColor,
                start = Offset(x, paddingY),
                end = Offset(x, size.height - paddingY),
                strokeWidth = stroke,
            )
        }

        for (row in 0..rowCount) {
            val y = paddingY + row * (rowHeight + gapPx)
            drawLine(
                color = lineColor,
                start = Offset(paddingX, y),
                end = Offset(size.width - paddingX, y),
                strokeWidth = stroke,
            )
        }
    }
}
