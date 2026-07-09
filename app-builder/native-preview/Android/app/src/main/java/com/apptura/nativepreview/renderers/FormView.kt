package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun FormView(
    block: Block,
    content: @Composable () -> Unit = {}
) {
    val title = propString(block, "title", "")
    val description = propString(block, "description", "")
    val submitLabel = propString(block, "submitLabel", "Submit")
    val backgroundColor = parseFormColor(propStringOrNull(block, "backgroundColor"), Color.White)
    val borderColor = parseFormColor(propStringOrNull(block, "borderColor"), Color(0xFFDBE3EF))
    val borderWidth = propNumber(block, "borderWidth", 1.0).toFloat().coerceAtLeast(0f)
    val borderRadius = propNumber(block, "borderRadius", 18.0).toFloat().coerceAtLeast(0f)
    val contentPadding = propNumber(block, "contentPadding", 16.0).toFloat().coerceAtLeast(0f)
    val shape = RoundedCornerShape(borderRadius.dp)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .background(backgroundColor, shape)
            .then(
                if (borderWidth > 0f) Modifier.border(borderWidth.dp, borderColor, shape) else Modifier
            )
    ) {
        content()
        Column(modifier = Modifier.fillMaxSize().padding(contentPadding.dp)) {
            if (title.isNotBlank()) {
                Text(text = title, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
            }
            if (description.isNotBlank()) {
                Text(
                    text = description,
                    color = Color(0xFF64748B),
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            Box(modifier = Modifier.weight(1f))
            Button(
                onClick = {},
                enabled = false,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(submitLabel.ifBlank { "Submit" })
            }
        }
    }
}

private fun propString(block: Block, key: String, fallback: String): String {
    return (block.props[key] as? JsonPrimitive)?.content ?: fallback
}

private fun propStringOrNull(block: Block, key: String): String? {
    return (block.props[key] as? JsonPrimitive)?.content
}

private fun propNumber(block: Block, key: String, fallback: Double): Double {
    return (block.props[key] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: fallback
}

private fun parseFormColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank() || value == "transparent") return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
