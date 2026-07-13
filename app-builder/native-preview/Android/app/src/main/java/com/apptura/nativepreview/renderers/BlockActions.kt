package com.apptura.nativepreview.renderers

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.apptura.nativepreview.models.Block
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

sealed interface BlockAction {
    data class Navigate(val targetPageId: String) : BlockAction
    data class SubmitData(val submitGroupId: String, val collectionId: String? = null) : BlockAction
    data class OpenUrl(val url: String) : BlockAction
}

fun resolveBlockAction(block: Block): BlockAction? {
    val action = block.props["action"] as? JsonObject
    when ((action?.get("type") as? JsonPrimitive)?.content) {
        "navigate" -> return BlockAction.Navigate(action.stringValue("targetPageId"))
        "submitData" -> return BlockAction.SubmitData(
            submitGroupId = action.stringValue("submitGroupId").ifBlank { "default" },
            collectionId = action.stringValue("collectionId").ifBlank { null },
        )
        "openUrl" -> return BlockAction.OpenUrl(action.stringValue("url"))
    }

    return when (block.type) {
        "navButton" -> BlockAction.Navigate(block.stringProp("toPageId"))
        "submitButton" -> BlockAction.SubmitData(
            submitGroupId = block.stringProp("submitGroupId").ifBlank { "default" },
            collectionId = block.stringProp("collectionId").ifBlank { null },
        )
        else -> null
    }
}

fun isTapActionConfigured(action: BlockAction?): Boolean = when (action) {
    is BlockAction.Navigate -> action.targetPageId.isNotBlank()
    is BlockAction.OpenUrl -> isSupportedExternalUrl(action.url)
    else -> false
}

fun executeBlockTapAction(
    context: Context,
    action: BlockAction,
    onNavigate: ((String) -> Unit)?,
) {
    when (action) {
        is BlockAction.Navigate -> {
            if (action.targetPageId.isNotBlank()) onNavigate?.invoke(action.targetPageId)
        }
        is BlockAction.OpenUrl -> {
            if (!isSupportedExternalUrl(action.url)) return
            runCatching {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(action.url)))
            }
        }
        is BlockAction.SubmitData -> Unit
    }
}

private fun isSupportedExternalUrl(value: String): Boolean {
    val scheme = runCatching { Uri.parse(value).scheme?.lowercase() }.getOrNull()
    return scheme == "http" || scheme == "https"
}

private fun JsonObject.stringValue(key: String): String =
    (get(key) as? JsonPrimitive)?.content?.trim().orEmpty()

private fun Block.stringProp(key: String): String =
    (props[key] as? JsonPrimitive)?.content?.trim().orEmpty()
