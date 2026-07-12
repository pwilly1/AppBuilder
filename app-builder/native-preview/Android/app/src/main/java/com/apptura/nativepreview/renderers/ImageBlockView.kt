package com.apptura.nativepreview.renderers

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun ImageBlockView(block: Block, onNavigate: ((String) -> Unit)? = null) {
    val src = imagePropString(block, "src", "")
    val alt = imagePropString(block, "alt", "Image")
    val fit = imagePropString(block, "fit", "cover")
    val backgroundColor = parseImageColor(imagePropStringOrNull(block, "backgroundColor"), Color(0xFFE2E8F0))
    val borderColor = parseImageColor(imagePropStringOrNull(block, "borderColor"), Color.Transparent)
    val borderWidth = imagePropFloat(block, "borderWidth", 0f).coerceAtLeast(0f)
    val borderRadius = imagePropFloat(block, "borderRadius", 16f).coerceAtLeast(0f)
    val opacity = imagePropFloat(block, "opacity", 1f).coerceIn(0f, 1f)
    val shape = RoundedCornerShape(borderRadius.dp)
    val contentScale = imageContentScale(fit)
    val bitmap = remember(src) { decodeDataImage(src) }
    val action = resolveBlockAction(block)
    val interactive = isTapActionConfigured(action)
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(opacity)
            .clip(shape)
            .background(backgroundColor)
            .clickable(enabled = interactive) {
                if (action != null) executeBlockTapAction(context, action, onNavigate)
            }
            .then(
                if (borderWidth > 0f) {
                    Modifier.border(borderWidth.dp, borderColor, shape)
                } else {
                    Modifier
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        when {
            bitmap != null -> {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = alt,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = contentScale
                )
            }
            src.isNotBlank() -> {
                AsyncImage(
                    model = src,
                    contentDescription = alt,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = contentScale
                )
            }
            else -> {
                Text(
                    text = "Add image",
                    color = Color(0xFF64748B),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }
    }
}

private fun imageContentScale(fit: String): ContentScale {
    return when (fit) {
        "contain" -> ContentScale.Fit
        "fill" -> ContentScale.FillBounds
        else -> ContentScale.Crop
    }
}

private fun decodeDataImage(src: String): android.graphics.Bitmap? {
    if (!src.startsWith("data:image")) return null
    val commaIndex = src.indexOf(',')
    if (commaIndex < 0 || commaIndex >= src.lastIndex) return null

    return try {
        val bytes = Base64.decode(src.substring(commaIndex + 1), Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    } catch (_: IllegalArgumentException) {
        null
    }
}

private fun imagePropString(block: Block, key: String, fallback: String): String {
    return (block.props[key] as? JsonPrimitive)?.content ?: fallback
}

private fun imagePropStringOrNull(block: Block, key: String): String? {
    return (block.props[key] as? JsonPrimitive)?.content
}

private fun imagePropFloat(block: Block, key: String, fallback: Float): Float {
    return (block.props[key] as? JsonPrimitive)?.content?.toFloatOrNull() ?: fallback
}

private fun parseImageColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank() || value == "transparent") return fallback

    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
