// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun NavButtonView(block: Block, onNavigate: ((String) -> Unit)?) {
    val label = (block.props["label"] as? JsonPrimitive)?.content ?: "Go"
    val toPageId = (block.props["toPageId"] as? JsonPrimitive)?.content
    val enabled = !toPageId.isNullOrBlank()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp)
    ) {
        Button(
            onClick = {
                val target = toPageId?.trim().orEmpty()
                if (target.isNotEmpty()) onNavigate?.invoke(target)
            },
            enabled = enabled,
            contentPadding = PaddingValues(
                start = 14.dp,
                top = 10.dp,
                end = 14.dp,
                bottom = 10.dp,
            ),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (enabled) Color(0xFF0F172A) else Color(0xFFE5E7EB),
                contentColor = if (enabled) Color.White else Color(0xFF475569),
                disabledContainerColor = Color(0xFFE5E7EB),
                disabledContentColor = Color(0xFF475569),
            ),
        ) {
            Text(text = label, fontSize = 14.sp)
        }
    }
}
