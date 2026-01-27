// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import android.content.Context

@Serializable
enum class BlockType { hero, text }

@Serializable
data class Block(
    val id: String,
    val type: BlockType,
    val props: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap()
)

@Serializable
data class Page(
    val id: String,
    val name: String = "Untitled",
    val blocks: List<Block> = emptyList()
)

@Serializable
data class Project(
    val pages: List<Page> = emptyList()
)

object ProjectLoader {
    private val json = Json { ignoreUnknownKeys = true }

    fun loadFromAssets(context: Context, fileName: String): Project {
        val input = context.assets.open(fileName)
        val content = input.bufferedReader().use { it.readText() }
        return json.decodeFromString(Project.serializer(), content)
    }
}
