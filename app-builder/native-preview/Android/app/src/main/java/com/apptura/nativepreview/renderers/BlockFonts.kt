package com.apptura.nativepreview.renderers

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.apptura.nativepreview.R
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

private val lato = FontFamily(Font(R.font.lato_regular), Font(R.font.lato_bold, FontWeight.Bold))
private val lusitana = FontFamily(Font(R.font.lusitana_regular), Font(R.font.lusitana_bold, FontWeight.Bold))
private val spaceMono = FontFamily(Font(R.font.spacemono_regular), Font(R.font.spacemono_bold, FontWeight.Bold))

// Unknown/missing IDs keep the existing platform font instead of fetching remote fonts.
fun blockFontFamily(block: Block): FontFamily? = when ((block.props["fontFamily"] as? JsonPrimitive)?.content) {
    "lato" -> lato
    "lusitana" -> lusitana
    "spaceMono" -> spaceMono
    else -> null
}
