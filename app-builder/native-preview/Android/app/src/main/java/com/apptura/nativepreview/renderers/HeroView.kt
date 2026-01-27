// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun HeroView(block: Block) {
    val headline = (block.props["headline"] as? JsonPrimitive)?.content ?: "Headline"
    val subhead = (block.props["subhead"] as? JsonPrimitive)?.content ?: ""

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text(text = headline, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        if (subhead.isNotEmpty()) {
            Text(text = subhead, fontSize = 18.sp)
        }
    }
}
