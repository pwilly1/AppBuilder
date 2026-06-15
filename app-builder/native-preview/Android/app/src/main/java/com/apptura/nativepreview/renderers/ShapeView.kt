package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun ShapeView(block: Block) {
    val shapeType = (block.props["shapeType"] as? JsonPrimitive)?.content ?: "rectangle"
    val fillColor = parseColor((block.props["fillColor"] as? JsonPrimitive)?.content, Color(0xFFDBEAFE))
    val borderColor = parseColor((block.props["borderColor"] as? JsonPrimitive)?.content, Color(0xFF2563EB))
    val borderWidth = (block.props["borderWidth"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 0.0
    val borderRadius = (block.props["borderRadius"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 18.0
    val opacity = ((block.props["opacity"] as? JsonPrimitive)?.content?.toFloatOrNull() ?: 1f).coerceIn(0f, 1f)
    val shape = resolveShape(shapeType, borderRadius.toFloat())

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(opacity)
            .background(fillColor, shape)
            .then(
                if (borderWidth > 0.0) {
                    Modifier.border(borderWidth.toFloat().dp, borderColor, shape)
                } else {
                    Modifier
                }
            )
    )
}

private fun resolveShape(shapeType: String, borderRadius: Float): Shape {
    return when (shapeType) {
        "circle", "pill" -> CircleShape
        else -> RoundedCornerShape(borderRadius.coerceAtLeast(0f).dp)
    }
}

private fun parseColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
