package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

fun appearanceNumber(block: Block, key: String, fallback: Float, max: Float = 96f): Float =
    (block.props[key] as? JsonPrimitive)?.content?.toFloatOrNull()
        ?.takeIf { it.isFinite() }?.coerceIn(0f, max) ?: fallback

fun appearanceColor(block: Block, key: String, fallback: Color): Color {
    val raw = (block.props[key] as? JsonPrimitive)?.content ?: return fallback
    if (raw.equals("transparent", ignoreCase = true)) return Color.Transparent
    if (!Regex("^#[0-9a-fA-F]{6}$").matches(raw)) return fallback
    return Color(android.graphics.Color.parseColor(raw))
}

fun Modifier.blockSurface(block: Block, isText: Boolean, scale: Float): Modifier {
    if (isText && (block.props["textSurfaceEnabled"] as? JsonPrimitive)?.content != "true") return this
    val width = appearanceNumber(block, "borderWidth", if (isText) 1f else 0f, 12f) * scale
    val shape = RoundedCornerShape((appearanceNumber(block, "borderRadius", if (isText) 12f else 0f, 999f) * scale).dp)
    return clip(shape)
        .background(appearanceColor(block, "backgroundColor", if (isText) Color.White else Color.Transparent))
        .border(width.dp, appearanceColor(block, "borderColor", Color(0xFFCBD5E1)), shape)
        // CSS borders consume interior space; Compose borders alone do not.
        .padding(width.dp)
}
