// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun TextView(block: Block) {
    val value = (block.props["value"] as? JsonPrimitive)?.content ?: "Text"
    val fontSize = (block.props["fontSize"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 16.0

    Text(
        text = value,
        fontSize = fontSize.sp,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
    )
}
