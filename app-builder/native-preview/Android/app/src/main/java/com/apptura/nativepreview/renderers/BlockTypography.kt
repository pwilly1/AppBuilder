package com.apptura.nativepreview.renderers

import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

private fun typographyString(block: Block, key: String) = (block.props[key] as? JsonPrimitive)?.content
private fun typographyFloat(block: Block, key: String): Float? = typographyString(block, key)?.toFloatOrNull()?.takeIf { it.isFinite() }

fun blockTextWeight(block: Block, fallback: FontWeight?): FontWeight? = when (typographyString(block, "fontWeight")) {
    "400" -> FontWeight.Normal
    "700" -> FontWeight.Bold
    else -> fallback
}

fun blockLineHeight(block: Block, fallback: Float): Float = typographyFloat(block, "lineHeight")?.coerceIn(1f, 3f) ?: fallback

@Composable
fun applyBlockTypography(block: Block, style: TextStyle, scale: Float = 1f): TextStyle = style.copy(
    fontWeight = blockTextWeight(block, style.fontWeight),
    fontStyle = when (typographyString(block, "fontStyle")) {
        "italic" -> FontStyle.Italic
        "normal" -> FontStyle.Normal
        else -> style.fontStyle
    },
    textDecoration = when (typographyString(block, "textDecoration")) {
        "underline" -> TextDecoration.Underline
        "none" -> TextDecoration.None
        else -> style.textDecoration
    },
    textAlign = when (typographyString(block, "textAlign")) {
        "left" -> TextAlign.Left
        "center" -> TextAlign.Center
        "right" -> TextAlign.Right
        else -> style.textAlign
    },
    letterSpacing = typographyFloat(block, "letterSpacing")?.let { previewSp(it.coerceIn(-2f, 10f) * scale) } ?: style.letterSpacing,
)
