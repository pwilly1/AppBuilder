// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.padding
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun NavButtonView(block: Block, onNavigate: ((String) -> Unit)?) {
    val label = (block.props["label"] as? JsonPrimitive)?.content ?: "Go"
    val toPageId = (block.props["toPageId"] as? JsonPrimitive)?.content

    Button(
        onClick = {
            val target = toPageId?.trim().orEmpty()
            if (target.isNotEmpty()) onNavigate?.invoke(target)
        },
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        enabled = !toPageId.isNullOrBlank()
    ) {
        Text(label)
    }
}
