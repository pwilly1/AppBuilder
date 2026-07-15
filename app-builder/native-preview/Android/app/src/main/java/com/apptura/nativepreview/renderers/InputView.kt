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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun InputView(block: Block, formRuntime: FormRuntimeState? = null) {
    val label = (block.props["label"] as? JsonPrimitive)?.content ?: "Label"
    val placeholder = (block.props["placeholder"] as? JsonPrimitive)?.content ?: "Placeholder"
    val initialValue = (block.props["value"] as? JsonPrimitive)?.content ?: ""
    val inputType = (block.props["inputType"] as? JsonPrimitive)?.content ?: "text"
    val fieldKey = resolveFieldKey(
        block.id,
        label,
        (block.props["fieldKey"] as? JsonPrimitive)?.content,
    )
    val submitGroupId = resolveSubmitGroupId((block.props["submitGroupId"] as? JsonPrimitive)?.content)
    val value = formRuntime?.getString(fieldKey, submitGroupId) ?: initialValue
    val fontSize = ((block.props["fontSize"] as? JsonPrimitive)?.content?.toFloatOrNull() ?: 14f).coerceAtLeast(8f)
    val backgroundColor = parseInputColor((block.props["backgroundColor"] as? JsonPrimitive)?.content, Color.White)
    val textColor = parseInputColor((block.props["textColor"] as? JsonPrimitive)?.content, Color(0xFF0F172A))
    val placeholderColor = parseInputColor((block.props["placeholderColor"] as? JsonPrimitive)?.content, Color(0xFF94A3B8))
    val borderColor = parseInputColor((block.props["borderColor"] as? JsonPrimitive)?.content, Color(0xFFCBD5E1))
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
                .padding(horizontal = 12.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            if (formRuntime == null) {
                Text(
                    text = if (inputType == "password" && value.isNotBlank()) "********" else displayValue,
                    fontSize = previewSp(fontSize),
                    lineHeight = previewSp(fontSize * 1.3f),
                    color = displayColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
                )
            } else {
                BasicTextField(
                    value = value,
                    onValueChange = { formRuntime.setString(fieldKey, it, submitGroupId, block.id) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    visualTransformation = if (inputType == "password") PasswordVisualTransformation() else VisualTransformation.None,
                    textStyle = TextStyle(
                        fontSize = previewSp(fontSize),
                        lineHeight = previewSp(fontSize * 1.3f),
                        color = textColor,
                        platformStyle = PlatformTextStyle(includeFontPadding = false),
                    ),
                    decorationBox = { innerTextField ->
                        if (value.isBlank()) {
                            Text(
                                text = placeholder,
                                fontSize = previewSp(fontSize),
                                lineHeight = previewSp(fontSize * 1.3f),
                                color = placeholderColor,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
                            )
                        }
                        innerTextField()
                    },
                )
            }
        }
    }
}

private fun parseInputColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
