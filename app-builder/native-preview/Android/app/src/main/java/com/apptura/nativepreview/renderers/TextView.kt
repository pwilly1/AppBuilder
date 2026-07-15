package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun TextView(block: Block, runtimeContext: RuntimeContext = RuntimeContext()) {
    val value = resolveBoundString(
        block,
        "value",
        readStaticString(block, "value", "Text"),
        runtimeContext,
    )
    val fontSize = (block.props["fontSize"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 16.0
    val contentPadding = (block.props["contentPadding"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 12.0
    val contentScale = getBlockContentScale(block)
    val scaledFontSize = fontSize.toFloat() * contentScale

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding((contentPadding.toFloat() * contentScale).dp)
    ) {
        Text(
            text = value,
            fontSize = previewSp(scaledFontSize),
            lineHeight = previewSp(scaledFontSize * 1.45f),
            style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
        )
    }
}
