package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateMap
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.AppDataCollection
import com.apptura.nativepreview.models.AppDataRecord
import com.apptura.nativepreview.models.Page
import com.apptura.nativepreview.models.Project
import com.apptura.nativepreview.models.ProjectLoader
import com.apptura.nativepreview.models.RuntimeValueRef
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull

private data class CollectionDataRequest(
    val key: String,
    val collectionId: String,
    val mode: String,
    val recordId: String? = null,
)

sealed interface RuntimeDataState {
    data object Loading : RuntimeDataState
    data object Empty : RuntimeDataState
    data class Ready(val recordId: String, val values: Map<String, String>) : RuntimeDataState
    data class Error(val message: String) : RuntimeDataState
}

data class RuntimeRecordContext(
    val collectionId: String,
    val recordId: String,
    val values: Map<String, String>,
)

class RuntimeContext(
    initialPageState: Map<String, String> = emptyMap(),
    val currentItem: RuntimeRecordContext? = null,
    private val parent: RuntimeContext? = null,
) {
    val pageState: SnapshotStateMap<String, String> = parent?.pageState
        ?: mutableStateMapOf<String, String>().apply { putAll(initialPageState) }
    val collectionData: SnapshotStateMap<String, RuntimeDataState> = parent?.collectionData
        ?: mutableStateMapOf<String, RuntimeDataState>()
    private var localDataRevision by mutableIntStateOf(0)
    val dataRevision: Int
        get() = parent?.dataRevision ?: localDataRevision

    fun setPageState(variableId: String, value: String) {
        if (pageState.containsKey(variableId)) pageState[variableId] = value
    }

    fun refreshCollectionData() {
        if (parent != null) {
            parent.refreshCollectionData()
        } else {
            localDataRevision += 1
        }
    }

    fun withCurrentItem(item: RuntimeRecordContext): RuntimeContext {
        return RuntimeContext(currentItem = item, parent = this)
    }
}

fun createPageRuntimeContext(page: Page): RuntimeContext {
    return RuntimeContext(
        initialPageState = page.stateVariables
            .filter { it.id.isNotBlank() && it.type == "text" }
            .associate { it.id to it.initialValue },
    )
}

@Composable
fun rememberPageRuntimeContext(
    page: Page,
    project: Project,
    projectId: String?,
    baseUrl: String,
    appUserToken: String? = null,
): RuntimeContext {
    val context = remember(page.id, page.stateVariables) { createPageRuntimeContext(page) }
    val dataRevision = context.dataRevision

    LaunchedEffect(page.id, page.blocks, project.dataCollections, projectId, baseUrl, appUserToken, dataRevision) {
        val requests = page.blocks
            .flatMap { it.bindings.values }
            .mapNotNull(::collectionDataRequest)
            .distinctBy { it.key }

        context.collectionData.clear()
        for (request in requests) {
            val collection = project.dataCollections.find { it.id == request.collectionId }
            if (collection == null || projectId.isNullOrBlank() || baseUrl.isBlank()) {
                context.collectionData[request.key] = RuntimeDataState.Error("Collection data is unavailable.")
                continue
            }

            context.collectionData[request.key] = RuntimeDataState.Loading
            context.collectionData[request.key] = try {
                val record = when (request.mode) {
                    "specific" -> ProjectLoader.getPublicCollectionRecord(
                            baseUrl = baseUrl,
                            projectId = projectId,
                            collectionId = request.collectionId,
                            recordId = requireNotNull(request.recordId),
                        )
                    "currentUser" -> appUserToken?.let { token ->
                        ProjectLoader.listCurrentAppUserCollectionRecords(
                            baseUrl = baseUrl,
                            projectId = projectId,
                            collectionId = request.collectionId,
                            appUserToken = token,
                        ).firstOrNull()
                    }
                    else -> ProjectLoader.getLatestPublicCollectionRecord(
                            baseUrl = baseUrl,
                            projectId = projectId,
                            collectionId = request.collectionId,
                        )
                }
                if (record == null) {
                    RuntimeDataState.Empty
                } else {
                    val values = mapRuntimeRecordValues(collection, record)
                    RuntimeDataState.Ready(recordId = record.id, values = values)
                }
            } catch (error: Exception) {
                RuntimeDataState.Error(error.message ?: "Could not load collection data.")
            }
        }
    }

    return context
}

fun mapRuntimeRecordValues(
    collection: AppDataCollection,
    record: AppDataRecord,
): Map<String, String> {
    return collection.fields.mapNotNull { field ->
        val value = record.data[field.key] as? JsonPrimitive ?: return@mapNotNull null
        field.id to (value.booleanOrNull?.let { if (it) "Yes" else "No" } ?: value.content)
    }.toMap()
}

fun resolveRuntimeString(
    reference: RuntimeValueRef,
    context: RuntimeContext,
    staticFallback: String = "",
    formRuntime: FormRuntimeState? = null,
): String {
    if (reference.source == "static") return reference.value ?: staticFallback
    if (reference.source == "formValue") {
        val fieldBlockId = reference.fieldBlockId?.takeIf { it.isNotBlank() }
            ?: return reference.fallback ?: staticFallback
        return formRuntime?.getFieldValue(fieldBlockId)?.content ?: reference.fallback ?: staticFallback
    }
    if (reference.source == "collection") {
        val fieldId = reference.fieldId?.takeIf { it.isNotBlank() }
            ?: return reference.fallback ?: staticFallback
        if (reference.record?.mode == "currentItem") {
            val collectionId = reference.collectionId?.takeIf { it.isNotBlank() }
                ?: return reference.fallback ?: staticFallback
            val currentItem = context.currentItem
            return if (currentItem?.collectionId == collectionId) {
                currentItem.values[fieldId] ?: reference.fallback ?: staticFallback
            } else {
                reference.fallback ?: staticFallback
            }
        }
        val request = collectionDataRequest(reference) ?: return reference.fallback ?: staticFallback
        val state = context.collectionData[request.key]
        return if (state is RuntimeDataState.Ready) {
            state.values[fieldId] ?: reference.fallback ?: staticFallback
        } else {
            reference.fallback ?: staticFallback
        }
    }
    if (reference.source != "pageState") return staticFallback
    val variableId = reference.variableId?.takeIf { it.isNotBlank() }
        ?: return reference.fallback ?: staticFallback
    return context.pageState[variableId] ?: reference.fallback ?: staticFallback
}

private fun collectionDataRequest(reference: RuntimeValueRef): CollectionDataRequest? {
    if (reference.source != "collection") return null
    val collectionId = reference.collectionId?.takeIf(String::isNotBlank) ?: return null
    val selector = reference.record
    return when (selector?.mode ?: "latest") {
        "latest" -> CollectionDataRequest(
            key = "$collectionId::latest",
            collectionId = collectionId,
            mode = "latest",
        )
        "currentUser" -> CollectionDataRequest(
            key = "$collectionId::currentUser",
            collectionId = collectionId,
            mode = "currentUser",
        )
        "specific" -> selector?.recordId
            ?.trim()
            ?.takeIf(String::isNotBlank)
            ?.let { recordId ->
                CollectionDataRequest(
                    key = "$collectionId::specific:$recordId",
                    collectionId = collectionId,
                    mode = "specific",
                    recordId = recordId,
                )
            }
        else -> null
    }
}

fun resolveBoundString(
    block: Block,
    propertyName: String,
    staticFallback: String,
    context: RuntimeContext,
): String {
    val reference = block.bindings[propertyName] ?: return staticFallback
    return resolveRuntimeString(reference, context, staticFallback)
}

fun readStaticString(block: Block, propertyName: String, fallback: String): String {
    return (block.props[propertyName] as? JsonPrimitive)?.content ?: fallback
}
