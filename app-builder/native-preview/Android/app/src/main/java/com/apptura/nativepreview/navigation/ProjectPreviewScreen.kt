// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.layout.GRID_CANVAS_WIDTH
import com.apptura.nativepreview.layout.GRID_GAP
import com.apptura.nativepreview.layout.GRID_PADDING
import com.apptura.nativepreview.layout.GRID_ROW_HEIGHT
import com.apptura.nativepreview.layout.GridMetrics
import com.apptura.nativepreview.layout.getGridRowCount
import com.apptura.nativepreview.layout.resolveBlockRenderRect
import com.apptura.nativepreview.models.Project
import com.apptura.nativepreview.renderers.BlockRenderer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectPreviewScreen(project: Project, baseUrl: String) {
    val pageIndex = remember { mutableStateOf(0) }
    val pages = project.pages

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(text = pages.getOrNull(pageIndex.value)?.title ?: pages.getOrNull(pageIndex.value)?.name ?: "Preview") })
        }
    ) { padding ->
        if (pages.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("No pages in project")
            }
        } else {
            val page = pages[pageIndex.value]
            val gridBlocks = page.blocks.filter { it.layout?.grid != null }
            val legacyBlocks = page.blocks.filter { it.layout?.grid == null }
            val scroll = rememberScrollState()

            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 12.dp)
                    .verticalScroll(scroll)
            ) {
                val canvasWidth = maxWidth.coerceAtMost(GRID_CANVAS_WIDTH)
                val metrics = GridMetrics(canvasWidth = canvasWidth)
                val gridRowCount = maxOf(1, getGridRowCount(gridBlocks))
                val contentHeight = GRID_ROW_HEIGHT * gridRowCount.toFloat() +
                    GRID_GAP * (gridRowCount - 1).toFloat() +
                    GRID_PADDING * 2f
                val gridHeight = if (contentHeight > 640.dp) contentHeight else 640.dp

                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .width(canvasWidth)
                            .height(gridHeight)
                            .align(Alignment.CenterHorizontally)
                    ) {
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
                                .align(Alignment.CenterHorizontally)
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
        }
    }
}
