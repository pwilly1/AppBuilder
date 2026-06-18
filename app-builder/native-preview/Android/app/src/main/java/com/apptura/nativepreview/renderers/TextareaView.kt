package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun TextareaView(block: Block) {
    val label = (block.props["label"] as? JsonPrimitive)?.content ?: "Message"
    val placeholder = (block.props["placeholder"] as? JsonPrimitive)?.content ?: "Write something..."
    val value = (block.props["value"] as? JsonPrimitive)?.content ?: ""
    val rows = ((block.props["rows"] as? JsonPrimitive)?.content?.toIntOrNull() ?: 3).coerceAtLeast(1)
    val fontSize = ((block.props["fontSize"] as? JsonPrimitive)?.content?.toFloatOrNull() ?: 14f).coerceAtLeast(8f)
    val backgroundColor = parseTextareaColor((block.props["backgroundColor"] as? JsonPrimitive)?.content, Color.White)
    val textColor = parseTextareaColor((block.props["textColor"] as? JsonPrimitive)?.content, Color(0xFF0F172A))
    val placeholderColor = parseTextareaColor((block.props["placeholderColor"] as? JsonPrimitive)?.content, Color(0xFF94A3B8))
    val borderColor = parseTextareaColor((block.props["borderColor"] as? JsonPrimitive)?.content, Color(0xFFCBD5E1))
    val borderRadius = ((block.props["borderRadius"] as? JsonPrimitive)?.content?.toFloatOrNull() ?: 12f).coerceAtLeast(0f)
    val displayValue = value.ifBlank { placeholder }
    val displayColor = if (value.isBlank()) placeholderColor else textColor

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(8.dp)
    ) {
        if (label.isNotBlank()) {
            Text(
                text = label,
                fontSize = previewSp((fontSize - 2f).coerceAtLeast(8f)),
                lineHeight = previewSp((fontSize - 2f).coerceAtLeast(8f) * 1.2f),
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF475569),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
                modifier = Modifier.padding(bottom = 6.dp)
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(RoundedCornerShape(borderRadius.dp))
                .background(backgroundColor)
                .border(1.dp, borderColor, RoundedCornerShape(borderRadius.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Text(
                text = displayValue,
                fontSize = previewSp(fontSize),
                lineHeight = previewSp(fontSize * 1.4f),
                color = displayColor,
                maxLines = rows,
                overflow = TextOverflow.Clip,
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
            )
        }
    }
}

private fun parseTextareaColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
