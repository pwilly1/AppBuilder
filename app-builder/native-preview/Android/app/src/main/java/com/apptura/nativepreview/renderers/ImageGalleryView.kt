// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private data class GalleryItem(
    val url: String,
    val caption: String
)

@Composable
fun ImageGalleryView(block: Block) {
    val title = (block.props["title"] as? JsonPrimitive)?.content ?: "Gallery"
    val columns = ((block.props["columns"] as? JsonPrimitive)?.content?.toIntOrNull() ?: 2).coerceIn(1, 3)
    val items = ((block.props["images"] as? JsonArray) ?: JsonArray(emptyList())).mapNotNull { element ->
        val obj = element as? JsonObject ?: return@mapNotNull null
        GalleryItem(
            url = (obj["url"] as? JsonPrimitive)?.content ?: "",
            caption = (obj["caption"] as? JsonPrimitive)?.content ?: "Gallery image"
        )
    }

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        items.chunked(columns).forEach { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowItems.forEach { item ->
                    Column(modifier = Modifier.weight(1f)) {
                        if (item.url.isNotBlank()) {
                            AsyncImage(
                                model = item.url,
                                contentDescription = item.caption,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(1f),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(1f)
                                    .background(Color(0xFFE2E8F0)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = item.caption,
                                    textAlign = TextAlign.Center,
                                    fontSize = 13.sp,
                                    color = Color(0xFF475569),
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }
                        Text(
                            text = item.caption,
                            fontSize = 13.sp,
                            color = Color(0xFF475569),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
                        )
                    }
                }
                repeat(columns - rowItems.size) {
                    Box(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
