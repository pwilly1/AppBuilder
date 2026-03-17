// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private data class ServiceItem(
    val name: String,
    val description: String,
    val price: String
)

@Composable
fun ServicesListView(block: Block) {
    val title = (block.props["title"] as? JsonPrimitive)?.content ?: "Services"
    val items = ((block.props["items"] as? JsonArray) ?: JsonArray(emptyList())).mapNotNull { element ->
        val obj = element as? JsonObject ?: return@mapNotNull null
        ServiceItem(
            name = (obj["name"] as? JsonPrimitive)?.content ?: "Service",
            description = (obj["description"] as? JsonPrimitive)?.content ?: "",
            price = (obj["price"] as? JsonPrimitive)?.content ?: ""
        )
    }

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        items.forEach { item ->
            OutlinedCard(modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                Row(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = item.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        if (item.description.isNotBlank()) {
                            Text(text = item.description, fontSize = 14.sp, modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                    if (item.price.isNotBlank()) {
                        Text(text = item.price, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 12.dp))
                    }
                }
            }
        }
    }
}
