package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun HeroView(block: Block, runtimeContext: RuntimeContext = RuntimeContext()) {
    val headline = resolveBoundString(
        block,
        "headline",
        readStaticString(block, "headline", "Headline"),
        runtimeContext,
    )
    val subhead = (block.props["subhead"] as? JsonPrimitive)?.content ?: ""
    val headlineSize = (block.props["headlineSize"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 28.0
    val contentPadding = appearanceNumber(block, "contentPadding", 16f)
    val textColor = parseHeroColor((block.props["textColor"] as? JsonPrimitive)?.content, Color(0xFF0F172A))
    val contentScale = getBlockContentScale(block)

    Column(modifier = Modifier.fillMaxSize().blockSurface(block, false, contentScale).padding((contentPadding * contentScale).dp)) {
        val scaledHeadlineSize = headlineSize.toFloat() * contentScale
        Text(fontFamily = blockFontFamily(block),
            text = headline,
            modifier = Modifier.fillMaxWidth(),
            color = textColor,
            fontSize = previewSp(scaledHeadlineSize),
            lineHeight = previewSp(scaledHeadlineSize * blockLineHeight(block, 1.15f)),
            fontWeight = blockTextWeight(block, FontWeight.Bold),
            style = applyBlockTypography(block, TextStyle(fontFamily = blockFontFamily(block), platformStyle = PlatformTextStyle(includeFontPadding = false)), contentScale)
        )
        if (subhead.isNotEmpty()) {
            val scaledSubheadSize = 18f * contentScale
            Text(fontFamily = blockFontFamily(block),
                text = subhead,
                color = textColor,
                fontSize = previewSp(scaledSubheadSize),
                lineHeight = previewSp(scaledSubheadSize * blockLineHeight(block, 1.45f)),
                style = applyBlockTypography(block, TextStyle(fontFamily = blockFontFamily(block), platformStyle = PlatformTextStyle(includeFontPadding = false)), contentScale)
            )
        }
    }
}

private fun parseHeroColor(raw: String?, fallback: Color): Color {
    val normalized = raw?.trim()?.removePrefix("#") ?: return fallback
    if (normalized.length != 6) return fallback
    return runCatching { Color((0xFF000000L or normalized.toLong(16)).toULong()) }.getOrDefault(fallback)
}
