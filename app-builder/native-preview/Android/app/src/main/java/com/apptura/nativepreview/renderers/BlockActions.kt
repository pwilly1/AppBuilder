package com.apptura.nativepreview.renderers

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.RuntimeValueRef
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

sealed interface BlockAction {
    data class Navigate(val targetPageId: String) : BlockAction
    data class SubmitData(val submitGroupId: String, val collectionId: String? = null) : BlockAction
    data class OpenUrl(val url: String) : BlockAction
    data class SetPageState(val variableId: String, val value: RuntimeValueRef) : BlockAction
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
        "setPageState" -> return BlockAction.SetPageState(
            variableId = action.stringValue("variableId"),
            value = action.runtimeValue("value") ?: RuntimeValueRef(source = "static", value = ""),
        )
    }

    return null
}

fun isTapActionConfigured(action: BlockAction?): Boolean = when (action) {
    is BlockAction.Navigate -> action.targetPageId.isNotBlank()
    is BlockAction.OpenUrl -> isSupportedExternalUrl(action.url)
    is BlockAction.SetPageState -> action.variableId.isNotBlank()
    else -> false
}

fun executeBlockTapAction(
    context: Context,
    action: BlockAction,
    onNavigate: ((String) -> Unit)?,
    runtimeContext: RuntimeContext,
    formRuntime: FormRuntimeState? = null,
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
        is BlockAction.SetPageState -> {
            if (action.variableId.isNotBlank()) {
                runtimeContext.setPageState(
                    action.variableId,
                    resolveRuntimeString(action.value, runtimeContext, formRuntime = formRuntime),
                )
            }
        }
    }
}

private fun isSupportedExternalUrl(value: String): Boolean {
    val scheme = runCatching { Uri.parse(value).scheme?.lowercase() }.getOrNull()
    return scheme == "http" || scheme == "https"
}

private fun JsonObject.stringValue(key: String): String =
    (get(key) as? JsonPrimitive)?.content?.trim().orEmpty()

private fun JsonObject.runtimeValue(key: String): RuntimeValueRef? {
    val value = get(key) as? JsonObject ?: return null
    val source = value.stringValue("source").ifBlank { "static" }
    return when (source) {
        "static" -> RuntimeValueRef(source = source, value = value.rawStringValue("value"))
        "pageState" -> RuntimeValueRef(
            source = source,
            variableId = value.stringValue("variableId"),
            fallback = value.rawStringValue("fallback").ifBlank { null },
        )
        "formValue" -> RuntimeValueRef(
            source = source,
            fieldBlockId = value.stringValue("fieldBlockId"),
            fallback = value.rawStringValue("fallback").ifBlank { null },
        )
        else -> null
    }
}

private fun JsonObject.rawStringValue(key: String): String =
    (get(key) as? JsonPrimitive)?.content.orEmpty()
