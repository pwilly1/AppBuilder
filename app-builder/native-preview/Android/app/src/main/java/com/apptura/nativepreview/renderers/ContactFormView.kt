// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonPrimitive

private fun booleanProp(block: Block, key: String, default: Boolean): Boolean {
    return (block.props[key] as? JsonPrimitive)?.content?.toBooleanStrictOrNull() ?: default
}

@Composable
fun ContactFormView(block: Block) {
    val title = (block.props["title"] as? JsonPrimitive)?.content ?: "Get in Touch"
    val subtitle = (block.props["subtitle"] as? JsonPrimitive)?.content ?: ""
    val submitLabel = (block.props["submitLabel"] as? JsonPrimitive)?.content ?: "Submit"
    val showName = booleanProp(block, "showName", true)
    val showEmail = booleanProp(block, "showEmail", true)
    val showPhone = booleanProp(block, "showPhone", true)
    val showMessage = booleanProp(block, "showMessage", true)

    OutlinedCard(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            if (subtitle.isNotBlank()) {
                Text(text = subtitle, fontSize = 14.sp, modifier = Modifier.padding(top = 6.dp))
            }
            if (showName) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    enabled = false,
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                )
            }
            if (showEmail) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    enabled = false,
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                )
            }
            if (showPhone) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    enabled = false,
                    label = { Text("Phone") },
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                )
            }
            if (showMessage) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    enabled = false,
                    minLines = 4,
                    label = { Text("Message") },
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                )
            }
            Button(
                onClick = {},
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp)
            ) {
                Text(submitLabel)
            }
        }
    }
}
