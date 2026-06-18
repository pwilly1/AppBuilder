package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun DividerView(block: Block) {
    val orientation = (block.props["orientation"] as? JsonPrimitive)?.content ?: "horizontal"
    val color = parseDividerColor((block.props["color"] as? JsonPrimitive)?.content, Color(0xFFCBD5E1))
    val thickness = ((block.props["thickness"] as? JsonPrimitive)?.content?.toFloatOrNull() ?: 2f).coerceAtLeast(1f)
    val isVertical = orientation == "vertical"

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Box(
            modifier = if (isVertical) {
                Modifier.width(thickness.dp).fillMaxHeight().background(color)
            } else {
                Modifier.fillMaxWidth().height(thickness.dp).background(color)
            }
        )
    }
}

private fun parseDividerColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
