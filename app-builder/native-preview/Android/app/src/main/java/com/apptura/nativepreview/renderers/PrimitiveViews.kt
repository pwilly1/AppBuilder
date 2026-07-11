package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
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
fun BadgeView(block: Block) {
    val text = propString(block, "text", "Badge")
    val fontSize = propFloat(block, "fontSize", 13f).coerceAtLeast(8f)
    val backgroundColor = parsePrimitiveColor(propStringOrNull(block, "backgroundColor"), Color(0xFFDBEAFE))
    val textColor = parsePrimitiveColor(propStringOrNull(block, "textColor"), Color(0xFF1D4ED8))
    val borderColor = parsePrimitiveColor(propStringOrNull(block, "borderColor"), Color(0xFFBFDBFE))
    val borderRadius = propFloat(block, "borderRadius", 999f).coerceAtLeast(0f)
    val paddingX = propFloat(block, "paddingX", 12f).coerceAtLeast(0f)
    val paddingY = propFloat(block, "paddingY", 6f).coerceAtLeast(0f)

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.TopStart) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(borderRadius.dp))
                .background(backgroundColor)
                .border(1.dp, borderColor, RoundedCornerShape(borderRadius.dp))
                .padding(horizontal = paddingX.dp, vertical = paddingY.dp)
        ) {
            Text(
                text = text.ifBlank { "Badge" },
                fontSize = previewSp(fontSize),
                lineHeight = previewSp(fontSize * 1.15f),
                fontWeight = FontWeight.Bold,
                color = textColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
            )
        }
    }
}

@Composable
fun IconView(block: Block) {
    val iconName = propString(block, "iconName", "star")
    val fontSize = propFloat(block, "fontSize", 28f).coerceAtLeast(8f)
    val color = parsePrimitiveColor(propStringOrNull(block, "color"), Color(0xFF2563EB))
    val backgroundColor = parsePrimitiveColor(propStringOrNull(block, "backgroundColor"), Color.White)
    val borderRadius = propFloat(block, "borderRadius", 999f).coerceAtLeast(0f)
    val icon = when (iconName) {
        "check" -> "✓"
        "home" -> "⌂"
        "search" -> "⌕"
        "user" -> "●"
        "heart" -> "♥"
        "bell" -> "◔"
        "plus" -> "+"
        "arrow" -> "→"
        else -> "★"
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(borderRadius.dp))
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = icon,
            fontSize = previewSp(fontSize),
            lineHeight = previewSp(fontSize),
            fontWeight = FontWeight.Bold,
            color = color,
            style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
        )
    }
}

@Composable
fun CheckboxView(block: Block, formRuntime: FormRuntimeState? = null) {
    val label = propString(block, "label", "Checkbox")
    val initialChecked = propBoolean(block, "checked", true)
    val fieldKey = resolveFieldKey(block.id, label, propStringOrNull(block, "fieldKey"))
    val submitGroupId = resolveSubmitGroupId(propStringOrNull(block, "submitGroupId"))
    val checked = formRuntime?.getBoolean(fieldKey, submitGroupId) ?: initialChecked
    val fontSize = propFloat(block, "fontSize", 14f).coerceAtLeast(8f)
    val textColor = parsePrimitiveColor(propStringOrNull(block, "textColor"), Color(0xFF0F172A))
    val boxColor = parsePrimitiveColor(propStringOrNull(block, "boxColor"), Color(0xFF2563EB))
    val checkColor = parsePrimitiveColor(propStringOrNull(block, "checkColor"), Color.White)
    val borderColor = parsePrimitiveColor(propStringOrNull(block, "borderColor"), Color(0xFF94A3B8))
    val boxSize = (fontSize + 3f).coerceAtLeast(14f)

    Row(
        modifier = Modifier
            .fillMaxSize()
            .clickable(enabled = formRuntime != null) {
                formRuntime?.setBoolean(fieldKey, !checked, submitGroupId)
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(boxSize.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(if (checked) boxColor else Color.Transparent)
                .border(1.dp, if (checked) boxColor else borderColor, RoundedCornerShape(5.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (checked) {
                Text(
                    text = "✓",
                    fontSize = previewSp(fontSize),
                    lineHeight = previewSp(fontSize),
                    fontWeight = FontWeight.Bold,
                    color = checkColor,
                    style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
                )
            }
        }
        Text(
            text = label.ifBlank { "Checkbox" },
            fontSize = previewSp(fontSize),
            lineHeight = previewSp(fontSize * 1.2f),
            color = textColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
        )
    }
}

@Composable
fun ToggleView(block: Block, formRuntime: FormRuntimeState? = null) {
    val label = propString(block, "label", "Toggle")
    val initialChecked = propBoolean(block, "checked", true)
    val fieldKey = resolveFieldKey(block.id, label, propStringOrNull(block, "fieldKey"))
    val submitGroupId = resolveSubmitGroupId(propStringOrNull(block, "submitGroupId"))
    val checked = formRuntime?.getBoolean(fieldKey, submitGroupId) ?: initialChecked
    val fontSize = propFloat(block, "fontSize", 14f).coerceAtLeast(8f)
    val textColor = parsePrimitiveColor(propStringOrNull(block, "textColor"), Color(0xFF0F172A))
    val activeColor = parsePrimitiveColor(propStringOrNull(block, "activeColor"), Color(0xFF2563EB))
    val inactiveColor = parsePrimitiveColor(propStringOrNull(block, "inactiveColor"), Color(0xFFCBD5E1))
    val knobColor = parsePrimitiveColor(propStringOrNull(block, "knobColor"), Color.White)
    val trackWidth = (fontSize * 2.8f).coerceAtLeast(34f)
    val trackHeight = (fontSize * 1.55f).coerceAtLeast(18f)
    val knobSize = (trackHeight - 4f).coerceAtLeast(8f)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable(enabled = formRuntime != null) {
                formRuntime?.setBoolean(fieldKey, !checked, submitGroupId)
            },
        contentAlignment = Alignment.TopStart,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(trackWidth.dp)
                    .height(trackHeight.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (checked) activeColor else inactiveColor)
            ) {
                Box(
                    modifier = Modifier
                        .size(knobSize.dp)
                        .offset(x = if (checked) (trackWidth - knobSize - 2f).dp else 2.dp, y = 2.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(knobColor)
                )
            }
            Text(
                text = label.ifBlank { "Toggle" },
                fontSize = previewSp(fontSize),
                lineHeight = previewSp(fontSize * 1.2f),
                color = textColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
            )
        }
    }
}

@Composable
fun ProgressBarView(block: Block) {
    val label = propString(block, "label", "Progress")
    val value = propFloat(block, "value", 65f).coerceIn(0f, 100f)
    val showLabel = propBoolean(block, "showLabel", true)
    val trackColor = parsePrimitiveColor(propStringOrNull(block, "trackColor"), Color(0xFFE2E8F0))
    val fillColor = parsePrimitiveColor(propStringOrNull(block, "fillColor"), Color(0xFF2563EB))
    val textColor = parsePrimitiveColor(propStringOrNull(block, "textColor"), Color(0xFF475569))
    val borderRadius = propFloat(block, "borderRadius", 999f).coerceAtLeast(0f)

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center
    ) {
        if (showLabel) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = label.ifBlank { "Progress" },
                    fontSize = previewSp(12f),
                    lineHeight = previewSp(13.2f),
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                    style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
                )
                Text(
                    text = "${value.toInt()}%",
                    fontSize = previewSp(12f),
                    lineHeight = previewSp(13.2f),
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                    style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
                )
            }
            Box(modifier = Modifier.height(6.dp))
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (showLabel) Modifier.height(10.dp) else Modifier.fillMaxHeight())
                .clip(RoundedCornerShape(borderRadius.dp))
                .background(trackColor)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(value / 100f)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(borderRadius.dp))
                    .background(fillColor)
            )
        }
    }
}

private fun propString(block: Block, key: String, fallback: String): String {
    return (block.props[key] as? JsonPrimitive)?.content ?: fallback
}

private fun propStringOrNull(block: Block, key: String): String? {
    return (block.props[key] as? JsonPrimitive)?.content
}

private fun propFloat(block: Block, key: String, fallback: Float): Float {
    return (block.props[key] as? JsonPrimitive)?.content?.toFloatOrNull() ?: fallback
}

private fun propBoolean(block: Block, key: String, fallback: Boolean): Boolean {
    return (block.props[key] as? JsonPrimitive)?.content?.toBooleanStrictOrNull() ?: fallback
}

private fun parsePrimitiveColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
