package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun TextView(
    block: Block,
    runtimeContext: RuntimeContext = RuntimeContext(),
    formRuntime: FormRuntimeState? = null,
) {
    val initialValue = resolveBoundString(
        block,
        "value",
        readStaticString(block, "value", "Text"),
        runtimeContext,
    )
    val editable = readTextBoolean(block, "editable", false)
    val multiline = readTextString(block, "textInputMode", "singleLine") == "multiline"
    val inputType = readTextString(block, "inputType", "text")
    val fieldLabel = readTextString(block, "fieldLabel", "Text field")
    val showFieldLabel = readTextBoolean(block, "showFieldLabel", false)
    val placeholder = readTextString(block, "placeholder", "Enter text...")
    val fieldKey = resolveFieldKey(
        block.id,
        fieldLabel,
        readTextString(block, "fieldKey", ""),
    )
    val fontSize = readTextFloat(block, "fontSize", 16f).coerceAtLeast(8f)
    val contentPadding = readTextFloat(block, "contentPadding", 12f).coerceAtLeast(0f)
    val contentScale = getBlockContentScale(block)
    val scaledFontSize = fontSize * contentScale
    val scaledPadding = contentPadding * contentScale
    val textColor = parseTextColor(readTextString(block, "textColor", ""), Color(0xFF0F172A))

    if (!editable) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(scaledPadding.dp),
        ) {
            Text(
                text = initialValue,
                color = textColor,
                fontSize = previewSp(scaledFontSize),
                lineHeight = previewSp(scaledFontSize * 1.45f),
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
            )
        }
        return
    }

    val value = formRuntime?.getString(block.id) ?: initialValue
    val backgroundColor = parseTextColor(
        readTextString(block, "backgroundColor", ""),
        Color.White,
    )
    val placeholderColor = parseTextColor(
        readTextString(block, "placeholderColor", ""),
        Color(0xFF94A3B8),
    )
    val borderColor = parseTextColor(
        readTextString(block, "borderColor", ""),
        Color(0xFFCBD5E1),
    )
    val borderWidth = readTextFloat(block, "borderWidth", 1f).coerceAtLeast(0f) * contentScale
    val borderRadius = readTextFloat(block, "borderRadius", 12f).coerceAtLeast(0f) * contentScale
    val shape = RoundedCornerShape(borderRadius.dp)

    LaunchedEffect(block.id, fieldKey, initialValue, formRuntime) {
        formRuntime?.seedString(fieldKey, initialValue, block.id)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(scaledPadding.dp),
    ) {
        if (showFieldLabel && fieldLabel.isNotBlank()) {
            val labelSize = (scaledFontSize - 2f * contentScale).coerceAtLeast(8f)
            Text(
                text = fieldLabel,
                color = textColor,
                fontSize = previewSp(labelSize),
                lineHeight = previewSp(labelSize * 1.2f),
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
                modifier = Modifier.padding(bottom = (6f * contentScale).dp),
            )
        }

        var fieldModifier = Modifier
            .fillMaxSize()
            .clip(shape)
            .background(backgroundColor)
        if (borderWidth > 0f) {
            fieldModifier = fieldModifier.border(borderWidth.dp, borderColor, shape)
        }
        fieldModifier = fieldModifier.padding(
            horizontal = (10f * contentScale).dp,
            vertical = (8f * contentScale).dp,
        )

        if (formRuntime == null) {
            val displayValue = if (value.isBlank()) placeholder else value
            val displayColor = if (value.isBlank()) placeholderColor else textColor
            Box(
                modifier = fieldModifier,
                contentAlignment = if (multiline) Alignment.TopStart else Alignment.CenterStart,
            ) {
                Text(
                    text = if (inputType == "password" && value.isNotBlank()) {
                        "\u2022".repeat(value.length)
                    } else {
                        displayValue
                    },
                    color = displayColor,
                    fontSize = previewSp(scaledFontSize),
                    lineHeight = previewSp(scaledFontSize * 1.45f),
                    maxLines = if (multiline) Int.MAX_VALUE else 1,
                    overflow = if (multiline) TextOverflow.Clip else TextOverflow.Ellipsis,
                    style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
                )
            }
            return@Column
        }

        BasicTextField(
            value = value,
            onValueChange = { formRuntime.setString(fieldKey, it, block.id) },
            modifier = fieldModifier,
            singleLine = !multiline,
            keyboardOptions = KeyboardOptions(keyboardType = resolveKeyboardType(inputType)),
            visualTransformation = if (inputType == "password") {
                PasswordVisualTransformation()
            } else {
                VisualTransformation.None
            },
            cursorBrush = SolidColor(textColor),
            textStyle = TextStyle(
                color = textColor,
                fontSize = previewSp(scaledFontSize),
                lineHeight = previewSp(scaledFontSize * 1.45f),
                platformStyle = PlatformTextStyle(includeFontPadding = false),
            ),
            decorationBox = { innerTextField ->
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = if (multiline) Alignment.TopStart else Alignment.CenterStart,
                ) {
                    if (value.isBlank()) {
                        Text(
                            text = placeholder,
                            color = placeholderColor,
                            fontSize = previewSp(scaledFontSize),
                            lineHeight = previewSp(scaledFontSize * 1.45f),
                            maxLines = if (multiline) Int.MAX_VALUE else 1,
                            overflow = if (multiline) TextOverflow.Clip else TextOverflow.Ellipsis,
                            style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
                        )
                    }
                    innerTextField()
                }
            },
        )
    }
}

private fun readTextString(block: Block, key: String, fallback: String): String =
    (block.props[key] as? JsonPrimitive)?.content ?: fallback

private fun readTextBoolean(block: Block, key: String, fallback: Boolean): Boolean =
    (block.props[key] as? JsonPrimitive)?.content?.toBooleanStrictOrNull() ?: fallback

private fun readTextFloat(block: Block, key: String, fallback: Float): Float =
    (block.props[key] as? JsonPrimitive)?.content?.toFloatOrNull() ?: fallback

private fun parseTextColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback
    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}

private fun resolveKeyboardType(inputType: String): KeyboardType = when (inputType) {
    "email" -> KeyboardType.Email
    "number" -> KeyboardType.Number
    "phone" -> KeyboardType.Phone
    "password" -> KeyboardType.Password
    else -> KeyboardType.Text
}
