package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun NavButtonView(block: Block, onNavigate: ((String) -> Unit)?) {
    val label = (block.props["label"] as? JsonPrimitive)?.content ?: "Go"
    val action = resolveBlockAction(block)
    val fontSize = (block.props["fontSize"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 14.0
    val contentPadding = (block.props["contentPadding"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 12.0
    val buttonPaddingX = (block.props["buttonPaddingX"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 14.0
    val buttonPaddingY = (block.props["buttonPaddingY"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 10.0
    val borderRadius = (block.props["borderRadius"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 10.0
    val backgroundColor = parseNavButtonColor((block.props["backgroundColor"] as? JsonPrimitive)?.content, Color(0xFF0F172A))
    val textColor = parseNavButtonColor((block.props["textColor"] as? JsonPrimitive)?.content, Color.White)
    val enabled = isTapActionConfigured(action)
    val context = LocalContext.current
    val contentScale = getBlockContentScale(block)
    val scaledFontSize = fontSize.toFloat() * contentScale

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding((contentPadding.toFloat() * contentScale).dp)
    ) {
        Button(
            onClick = {
                if (action != null) executeBlockTapAction(context, action, onNavigate)
            },
            enabled = enabled,
            contentPadding = PaddingValues(
                start = (buttonPaddingX.toFloat() * contentScale).dp,
                top = (buttonPaddingY.toFloat() * contentScale).dp,
                end = (buttonPaddingX.toFloat() * contentScale).dp,
                bottom = (buttonPaddingY.toFloat() * contentScale).dp,
            ),
            shape = RoundedCornerShape((borderRadius.toFloat() * contentScale).dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (enabled) backgroundColor else Color(0xFFE5E7EB),
                contentColor = if (enabled) textColor else Color(0xFF475569),
                disabledContainerColor = Color(0xFFE5E7EB),
                disabledContentColor = Color(0xFF475569),
            ),
        ) {
            Text(
                text = label,
                fontSize = previewSp(scaledFontSize),
                lineHeight = previewSp(scaledFontSize * 1.2f),
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
            )
        }
    }
}

private fun parseNavButtonColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
