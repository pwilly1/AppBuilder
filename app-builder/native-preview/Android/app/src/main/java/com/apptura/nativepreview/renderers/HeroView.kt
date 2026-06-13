package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun HeroView(block: Block) {
    val headline = (block.props["headline"] as? JsonPrimitive)?.content ?: "Headline"
    val subhead = (block.props["subhead"] as? JsonPrimitive)?.content ?: ""
    val headlineSize = (block.props["headlineSize"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 28.0
    val contentPadding = (block.props["contentPadding"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 16.0
    val contentScale = getBlockContentScale(block)

    Column(modifier = Modifier.fillMaxWidth().padding((contentPadding.toFloat() * contentScale).dp)) {
        val scaledHeadlineSize = headlineSize.toFloat() * contentScale
        Text(
            text = headline,
            fontSize = previewSp(scaledHeadlineSize),
            lineHeight = previewSp(scaledHeadlineSize * 1.15f),
            fontWeight = FontWeight.Bold,
            style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
        )
        if (subhead.isNotEmpty()) {
            val scaledSubheadSize = 18f * contentScale
            Text(
                text = subhead,
                fontSize = previewSp(scaledSubheadSize),
                lineHeight = previewSp(scaledSubheadSize * 1.45f),
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
            )
        }
    }
}
