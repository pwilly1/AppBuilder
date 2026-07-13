package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.AppDataRecord
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.ProjectLoader
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull

@Composable
fun DataListView(block: Block, projectId: String?, baseUrl: String?) {
    val collectionId = dataListPropString(block, "collectionId", "")
    val title = dataListPropString(block, "title", "Records")
    val emptyMessage = dataListPropString(block, "emptyMessage", "No records yet.")
    val configuredKeys = dataListPropString(block, "displayFieldKeys", "")
        .split(',')
        .map { it.trim() }
        .filter { it.isNotBlank() }
    val backgroundColor = parseDataListColor(dataListPropStringOrNull(block, "backgroundColor"), Color.White)
    val textColor = parseDataListColor(dataListPropStringOrNull(block, "textColor"), Color(0xFF0F172A))
    val borderColor = parseDataListColor(dataListPropStringOrNull(block, "borderColor"), Color(0xFFDBE3EF))
    val borderRadius = dataListPropNumber(block, "borderRadius", 14.0).toFloat().coerceAtLeast(0f)
    var records by remember(block.id, collectionId) { mutableStateOf<List<AppDataRecord>>(emptyList()) }
    var status by remember(block.id, collectionId) { mutableStateOf(DataListStatus.IDLE) }
    var errorMessage by remember(block.id, collectionId) { mutableStateOf("") }

    LaunchedEffect(projectId, baseUrl, collectionId) {
        if (projectId.isNullOrBlank() || baseUrl.isNullOrBlank() || collectionId.isBlank()) return@LaunchedEffect
        status = DataListStatus.LOADING
        try {
            records = ProjectLoader.listPublicCollectionRecords(baseUrl, projectId, collectionId)
            status = DataListStatus.READY
        } catch (error: Exception) {
            errorMessage = error.message ?: "Could not load records."
            status = DataListStatus.ERROR
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor, RoundedCornerShape(borderRadius.dp))
            .border(1.dp, borderColor, RoundedCornerShape(borderRadius.dp))
            .padding(12.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(title, color = textColor, fontSize = previewSp(16f))
            when {
                collectionId.isBlank() -> Text("Choose a collection in the editor.", color = Color(0xFF64748B), fontSize = previewSp(13f))
                status == DataListStatus.LOADING -> Text("Loading records...", color = Color(0xFF64748B), fontSize = previewSp(13f))
                status == DataListStatus.ERROR -> Text(errorMessage, color = Color(0xFFB91C1C), fontSize = previewSp(13f))
                status == DataListStatus.READY && records.isEmpty() -> Text(emptyMessage, color = Color(0xFF64748B), fontSize = previewSp(13f))
                else -> records.forEach { record ->
                    val keys = configuredKeys.ifEmpty { record.data.keys.toList() }
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, borderColor, RoundedCornerShape(10.dp))
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        keys.forEach { key ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(formatDataListLabel(key), color = textColor, fontSize = previewSp(13f))
                                Text(formatDataListValue(record.data[key] as? JsonPrimitive), color = textColor, fontSize = previewSp(13f))
                            }
                        }
                    }
                }
            }
        }
    }
}

private enum class DataListStatus { IDLE, LOADING, READY, ERROR }

private fun formatDataListLabel(value: String): String =
    value.split('_').joinToString(" ") { part -> part.replaceFirstChar { it.uppercase() } }

private fun formatDataListValue(value: JsonPrimitive?): String =
    value?.booleanOrNull?.let { if (it) "Yes" else "No" }
        ?: value?.content?.ifBlank { "-" }
        ?: "-"

private fun parseDataListColor(value: String?, fallback: Color): Color = try {
    if (value.isNullOrBlank()) fallback else Color(android.graphics.Color.parseColor(value))
} catch (_: IllegalArgumentException) {
    fallback
}

private fun dataListPropString(block: Block, key: String, fallback: String): String =
    (block.props[key] as? JsonPrimitive)?.content ?: fallback

private fun dataListPropStringOrNull(block: Block, key: String): String? =
    (block.props[key] as? JsonPrimitive)?.content

private fun dataListPropNumber(block: Block, key: String, fallback: Double): Double =
    (block.props[key] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: fallback
