package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun ContainerView(
    block: Block,
    content: @Composable () -> Unit = {}
) {
    val backgroundColor = parseContainerColor(propStringOrNull(block, "backgroundColor"), Color.Transparent)
    val borderColor = parseContainerColor(propStringOrNull(block, "borderColor"), Color.Transparent)
    val borderWidth = propNumber(block, "borderWidth", 0.0).toFloat().coerceAtLeast(0f)
    val borderRadius = propNumber(block, "borderRadius", 0.0).toFloat().coerceAtLeast(0f)
    val opacity = propNumber(block, "opacity", 1.0).toFloat().coerceIn(0f, 1f)
    val shape = RoundedCornerShape(borderRadius.dp)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .alpha(opacity)
            .background(backgroundColor, shape)
            .then(
                if (borderWidth > 0f) {
                    Modifier.border(borderWidth.dp, borderColor, shape)
                } else {
                    Modifier
                }
            )
    ) {
        content()
    }
}

private fun propStringOrNull(block: Block, key: String): String? {
    return (block.props[key] as? JsonPrimitive)?.content
}

private fun propNumber(block: Block, key: String, fallback: Double): Double {
    return (block.props[key] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: fallback
}

private fun parseContainerColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank() || value == "transparent") return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
