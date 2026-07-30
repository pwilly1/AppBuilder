// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.navigation

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.layout.GRID_DEFAULT_ROW_COUNT
import com.apptura.nativepreview.layout.GRID_GAP
import com.apptura.nativepreview.layout.GRID_CANVAS_WIDTH
import com.apptura.nativepreview.layout.GRID_PADDING
import com.apptura.nativepreview.layout.GRID_ROW_HEIGHT
import com.apptura.nativepreview.layout.GridMetrics
import com.apptura.nativepreview.layout.getColumnWidth
import com.apptura.nativepreview.layout.getGridRowCount
import com.apptura.nativepreview.layout.resolveBlockRenderRect
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.AppDataRecord
import com.apptura.nativepreview.models.Project
import com.apptura.nativepreview.models.ProjectLoader
import com.apptura.nativepreview.renderers.BlockRenderer
import com.apptura.nativepreview.renderers.FormRuntimeState
import com.apptura.nativepreview.renderers.RuntimeAppUserSessionStore
import com.apptura.nativepreview.renderers.RuntimeContext
import com.apptura.nativepreview.renderers.RuntimeRecordContext
import com.apptura.nativepreview.renderers.mapRuntimeRecordValues
import com.apptura.nativepreview.renderers.rememberPageRuntimeContext
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun ProjectPreviewScreen(project: Project, baseUrl: String, onExit: () -> Unit = {}) {
    val pageIndex = remember { mutableStateOf(0) }
    val pendingProtectedPageId = remember(project.id) { mutableStateOf<String?>(null) }
    val pages = project.pages

    if (pages.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text("No pages in project")
        }
    } else {
        val context = LocalContext.current
        val appUserToken = RuntimeAppUserSessionStore.observeToken(context, project.id)
        val appUserSignedIn = !appUserToken.isNullOrBlank()
        val selectedPage = pages.getOrNull(pageIndex.value)
        val requestedPageId = if (appUserSignedIn && pendingProtectedPageId.value != null) {
            pendingProtectedPageId.value
        } else {
            selectedPage?.id
        }
        val resolvedPageIndex = resolveAccessiblePageIndex(pages, requestedPageId, appUserSignedIn)

        LaunchedEffect(
            appUserSignedIn,
            pageIndex.value,
            pendingProtectedPageId.value,
            resolvedPageIndex,
        ) {
            if (
                !appUserSignedIn
                && selectedPage != null
                && selectedPage.access?.mode == "signedIn"
            ) {
                pendingProtectedPageId.value = selectedPage.id
            }
            if (resolvedPageIndex != null && pageIndex.value != resolvedPageIndex) {
                pageIndex.value = resolvedPageIndex
            }
            if (appUserSignedIn && pendingProtectedPageId.value != null) {
                pendingProtectedPageId.value = null
            }
        }

        if (resolvedPageIndex == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text("Page unavailable")
                ExitPreviewButton(onExit = onExit)
            }
            return
        }

        val page = pages[resolvedPageIndex]
        val pageBackgroundColor = parsePageBackgroundColor(page.appearance?.backgroundColor)
        val formRuntime = remember(project.id, page.id) { FormRuntimeState() }
        val runtimeContext = rememberPageRuntimeContext(
            page = page,
            project = project,
            projectId = project.id,
            baseUrl = baseUrl,
            appUserToken = appUserToken,
        )
        val containerIds = page.blocks
            .filter { it.type == "container" || it.type == "form" || it.type == "repeater" }
            .map { it.id }
            .toSet()
        val childrenByParentId = page.blocks
            .filter { it.parentId != null && containerIds.contains(it.parentId) }
            .groupBy { it.parentId ?: "" }
        val gridBlocks = page.blocks.filter {
            it.layout?.grid != null && (it.parentId == null || !containerIds.contains(it.parentId))
        }
        val legacyBlocks = page.blocks.filter {
            it.layout?.grid == null && (it.parentId == null || !containerIds.contains(it.parentId))
        }
        val scroll = rememberScrollState()
        val navigateToPage: (String) -> Unit = { targetPageId ->
            val targetPage = pages.find { it.id == targetPageId }
            if (
                !appUserSignedIn
                && targetPage != null
                && targetPage.access?.mode == "signedIn"
            ) {
                pendingProtectedPageId.value = targetPage.id
            }
            resolveAccessiblePageIndex(pages, targetPageId, appUserSignedIn)?.let { index ->
                pageIndex.value = index
            }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(pageBackgroundColor)
        ) {
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxSize()
                    .background(pageBackgroundColor)
                    .verticalScroll(scroll)
            ) {
                val canvasWidth = if (maxWidth.value > 1f) maxWidth else GRID_CANVAS_WIDTH
                val metrics = GridMetrics(canvasWidth = canvasWidth)
                val gridRowCount = maxOf(GRID_DEFAULT_ROW_COUNT, getGridRowCount(gridBlocks))
                val rowContentHeight = GRID_ROW_HEIGHT * gridRowCount.toFloat() +
                    GRID_GAP * (gridRowCount - 1).toFloat() +
                    GRID_PADDING * 2f
                val renderBottom = gridBlocks.fold(0.dp) { currentMax, block ->
                    val rect = resolveBlockRenderRect(block, metrics)
                    val bottom = if (rect == null) 0.dp else rect.top + rect.height + GRID_PADDING
                    if (bottom > currentMax) bottom else currentMax
                }
                val contentHeight = if (renderBottom > rowContentHeight) renderBottom else rowContentHeight
                val gridHeight = maxOf(maxHeight, contentHeight)

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
                            GridBlockLayer(
                                block = block,
                                childrenByParentId = childrenByParentId,
                                metrics = metrics,
                                project = project,
                                projectId = project.id,
                                baseUrl = baseUrl,
                                appUserToken = appUserToken,
                                formRuntime = formRuntime,
                                runtimeContext = runtimeContext,
                                onNavigate = navigateToPage,
                            )
                        }
                    }

                    if (legacyBlocks.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Column(
                            modifier = Modifier
                                .width(canvasWidth)
                        ) {
                            legacyBlocks.forEach { block ->
                                BlockRenderer(
                                    block = block,
                                    projectId = project.id,
                                    baseUrl = baseUrl,
                                    formRuntime = formRuntime,
                                    runtimeContext = runtimeContext,
                                    onNavigate = navigateToPage,
                                )
                            }
                        }
                    }
                }
            }

            ExitPreviewButton(onExit = onExit)
        }
    }
}

@Composable
private fun BoxScope.ExitPreviewButton(onExit: () -> Unit) {
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

private fun parsePageBackgroundColor(raw: String?): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return Color.White

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        Color.White
    }
}

@Composable
private fun GridBlockLayer(
    block: Block,
    childrenByParentId: Map<String, List<Block>>,
    metrics: GridMetrics,
    project: Project,
    projectId: String?,
    baseUrl: String,
    appUserToken: String?,
    formRuntime: FormRuntimeState,
    runtimeContext: RuntimeContext,
    onNavigate: (String) -> Unit,
) {
    val rect = resolveBlockRenderRect(block, metrics) ?: return
    val placement = block.layout?.grid
    val children = childrenByParentId[block.id].orEmpty()

    Box(
        modifier = Modifier
            .offset(x = rect.left, y = rect.top)
            .width(rect.width)
            .height(rect.height)
            .clipToBounds()
    ) {
        BlockRenderer(
            block = block,
            projectId = projectId,
            baseUrl = baseUrl,
            formRuntime = formRuntime,
            runtimeContext = runtimeContext,
            content = {
                if (block.type == "repeater" && placement != null) {
                    val childMetrics = GridMetrics(
                        canvasWidth = rect.width,
                        columnCount = placement.colSpan.coerceAtLeast(1),
                        rowHeight = metrics.rowHeight,
                        gap = metrics.gap,
                        paddingX = 0.dp,
                        paddingY = 0.dp,
                    )
                    RepeaterGridContent(
                        repeater = block,
                        children = children,
                        childrenByParentId = childrenByParentId,
                        metrics = childMetrics,
                        project = project,
                        projectId = projectId,
                        baseUrl = baseUrl,
                        appUserToken = appUserToken,
                        formRuntime = formRuntime,
                        runtimeContext = runtimeContext,
                        onNavigate = onNavigate,
                    )
                } else if ((block.type == "container" || block.type == "form") && placement != null) {
                    val childMetrics = GridMetrics(
                        canvasWidth = rect.width,
                        columnCount = placement.colSpan.coerceAtLeast(1),
                        rowHeight = metrics.rowHeight,
                        gap = metrics.gap,
                        paddingX = 0.dp,
                        paddingY = 0.dp,
                    )

                    children.forEach { child ->
                        GridBlockLayer(
                            block = child,
                            childrenByParentId = childrenByParentId,
                            metrics = childMetrics,
                            project = project,
                            projectId = projectId,
                            baseUrl = baseUrl,
                            appUserToken = appUserToken,
                            formRuntime = formRuntime,
                            runtimeContext = runtimeContext,
                            onNavigate = onNavigate,
                        )
                    }
                }
            },
            onNavigate = onNavigate,
        )
    }
}

private data class RepeaterSettings(
    val collectionId: String,
    val scope: String,
    val order: String,
    val limit: Int,
    val itemRowSpan: Int,
    val gapRows: Int,
    val emptyText: String,
)

private sealed interface RepeaterRecordsState {
    data object Loading : RepeaterRecordsState
    data class Ready(val records: List<AppDataRecord>) : RepeaterRecordsState
    data class Empty(val message: String) : RepeaterRecordsState
    data class Error(val message: String) : RepeaterRecordsState
}

@Composable
private fun RepeaterGridContent(
    repeater: Block,
    children: List<Block>,
    childrenByParentId: Map<String, List<Block>>,
    metrics: GridMetrics,
    project: Project,
    projectId: String?,
    baseUrl: String,
    appUserToken: String?,
    formRuntime: FormRuntimeState,
    runtimeContext: RuntimeContext,
    onNavigate: (String) -> Unit,
) {
    val settings = readRepeaterSettings(repeater)
    val collection = project.dataCollections.find { it.id == settings.collectionId }
    val dataRevision = runtimeContext.dataRevision
    var recordsState by remember(repeater.id) {
        mutableStateOf<RepeaterRecordsState>(RepeaterRecordsState.Loading)
    }

    LaunchedEffect(
        repeater.id,
        repeater.props,
        project.dataCollections,
        projectId,
        baseUrl,
        appUserToken,
        dataRevision,
    ) {
        recordsState = when {
            projectId.isNullOrBlank() || baseUrl.isBlank() ->
                RepeaterRecordsState.Error("Collection data is unavailable.")
            collection == null ->
                RepeaterRecordsState.Error(
                    if (settings.collectionId.isBlank()) {
                        "Choose a collection for this list."
                    } else {
                        "The configured collection no longer exists."
                    },
                )
            settings.scope == "currentUser" && appUserToken.isNullOrBlank() ->
                RepeaterRecordsState.Error("Sign in to view your records.")
            else -> try {
                val page = ProjectLoader.listRuntimeCollectionRecords(
                    baseUrl = baseUrl,
                    projectId = projectId,
                    collectionId = collection.id,
                    scope = settings.scope,
                    order = settings.order,
                    limit = settings.limit,
                    appUserToken = appUserToken,
                )
                if (page.records.isEmpty()) {
                    RepeaterRecordsState.Empty(settings.emptyText)
                } else {
                    RepeaterRecordsState.Ready(page.records)
                }
            } catch (error: Exception) {
                RepeaterRecordsState.Error(error.message ?: "Could not load collection records.")
            }
        }
    }

    val itemHeight = metrics.rowHeight * settings.itemRowSpan.toFloat() +
        metrics.gap * (settings.itemRowSpan - 1).coerceAtLeast(0).toFloat()
    val gapHeight = if (settings.gapRows == 0) {
        0.dp
    } else {
        metrics.rowHeight * settings.gapRows.toFloat() +
            metrics.gap * (settings.gapRows - 1).coerceAtLeast(0).toFloat()
    }

    when (val state = recordsState) {
        RepeaterRecordsState.Loading -> RepeaterStatusMessage("Loading records...")
        is RepeaterRecordsState.Empty -> RepeaterStatusMessage(state.message)
        is RepeaterRecordsState.Error -> RepeaterStatusMessage(state.message, isError = true)
        is RepeaterRecordsState.Ready -> {
            if (children.isEmpty()) {
                RepeaterStatusMessage("This list does not have an item design yet.")
                return
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                state.records.forEachIndexed { index, record ->
                    key("${repeater.id}:${record.id}") {
                        val values = collection?.let { mapRuntimeRecordValues(it, record) }.orEmpty()
                        val itemContext = runtimeContext.withCurrentItem(
                            RuntimeRecordContext(
                                collectionId = settings.collectionId,
                                recordId = record.id,
                                values = values,
                            ),
                        )

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(itemHeight)
                                .clipToBounds()
                        ) {
                            children.forEach { child ->
                                key("${repeater.id}:${record.id}:${child.id}") {
                                    GridBlockLayer(
                                        block = child,
                                        childrenByParentId = childrenByParentId,
                                        metrics = metrics,
                                        project = project,
                                        projectId = projectId,
                                        baseUrl = baseUrl,
                                        appUserToken = appUserToken,
                                        formRuntime = formRuntime,
                                        runtimeContext = itemContext,
                                        onNavigate = onNavigate,
                                    )
                                }
                            }
                        }
                        if (index < state.records.lastIndex && gapHeight > 0.dp) {
                            Spacer(modifier = Modifier.height(gapHeight))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RepeaterStatusMessage(message: String, isError: Boolean = false) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            color = if (isError) Color(0xFFDC2626) else Color(0xFF64748B),
        )
    }
}

private fun readRepeaterSettings(block: Block): RepeaterSettings {
    fun string(name: String): String =
        (block.props[name] as? JsonPrimitive)?.content?.trim().orEmpty()
    fun integer(name: String, fallback: Int, min: Int, max: Int): Int =
        (block.props[name] as? JsonPrimitive)
            ?.content
            ?.toIntOrNull()
            ?.coerceIn(min, max)
            ?: fallback

    return RepeaterSettings(
        collectionId = string("collectionId"),
        scope = if (string("scope") == "currentUser") "currentUser" else "all",
        order = if (string("order") == "oldest") "oldest" else "newest",
        limit = integer("limit", fallback = 10, min = 1, max = 20),
        itemRowSpan = integer("itemRowSpan", fallback = 4, min = 1, max = 29),
        gapRows = integer("gapRows", fallback = 1, min = 0, max = 29),
        emptyText = string("emptyText").ifBlank { "No records yet" },
    )
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
