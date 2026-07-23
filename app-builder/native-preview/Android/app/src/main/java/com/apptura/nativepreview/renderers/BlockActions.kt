package com.apptura.nativepreview.renderers

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.CollectionRecordSelector
import com.apptura.nativepreview.models.RuntimeValueRef
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive

data class SubmitDataFieldRef(val fieldBlockId: String, val targetFieldKey: String? = null)

sealed interface BlockAction {
    data class Navigate(val targetPageId: String) : BlockAction
    data class SubmitData(val fields: List<SubmitDataFieldRef>, val collectionId: String? = null) : BlockAction
    data class OpenUrl(val url: String) : BlockAction
    data class SetPageState(val variableId: String, val value: RuntimeValueRef) : BlockAction
    data class SignUpAppUser(
        val displayNameFieldBlockId: String? = null,
        val emailFieldBlockId: String,
        val passwordFieldBlockId: String,
    ) : BlockAction
    data class LoginAppUser(
        val emailFieldBlockId: String,
        val passwordFieldBlockId: String,
    ) : BlockAction
    data object LogoutAppUser : BlockAction
}

fun resolveBlockAction(block: Block): BlockAction? {
    val action = block.props["action"] as? JsonObject
    when ((action?.get("type") as? JsonPrimitive)?.content) {
        "navigate" -> return BlockAction.Navigate(action.stringValue("targetPageId"))
        "submitData" -> return BlockAction.SubmitData(
            fields = action.submitFields(),
            collectionId = action.stringValue("collectionId").ifBlank { null },
        )
        "openUrl" -> return BlockAction.OpenUrl(action.stringValue("url"))
        "setPageState" -> return BlockAction.SetPageState(
            variableId = action.stringValue("variableId"),
            value = action.runtimeValue("value") ?: RuntimeValueRef(source = "static", value = ""),
        )
        "signUpAppUser" -> return BlockAction.SignUpAppUser(
            displayNameFieldBlockId = action.stringValue("displayNameFieldBlockId").ifBlank { null },
            emailFieldBlockId = action.stringValue("emailFieldBlockId"),
            passwordFieldBlockId = action.stringValue("passwordFieldBlockId"),
        )
        "loginAppUser" -> return BlockAction.LoginAppUser(
            emailFieldBlockId = action.stringValue("emailFieldBlockId"),
            passwordFieldBlockId = action.stringValue("passwordFieldBlockId"),
        )
        "logoutAppUser" -> return BlockAction.LogoutAppUser
    }

    return null
}

fun isTapActionConfigured(action: BlockAction?): Boolean = when (action) {
    is BlockAction.Navigate -> action.targetPageId.isNotBlank()
    is BlockAction.OpenUrl -> isSupportedExternalUrl(action.url)
    is BlockAction.SetPageState -> action.variableId.isNotBlank()
    is BlockAction.SignUpAppUser -> action.emailFieldBlockId.isNotBlank()
        && action.passwordFieldBlockId.isNotBlank()
    is BlockAction.LoginAppUser -> action.emailFieldBlockId.isNotBlank()
        && action.passwordFieldBlockId.isNotBlank()
    BlockAction.LogoutAppUser -> true
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
        is BlockAction.SignUpAppUser,
        is BlockAction.LoginAppUser,
        BlockAction.LogoutAppUser -> Unit
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
        "collection" -> RuntimeValueRef(
            source = source,
            collectionId = value.stringValue("collectionId"),
            fieldId = value.stringValue("fieldId"),
            record = value.collectionRecordSelector(),
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

private fun JsonObject.collectionRecordSelector(): CollectionRecordSelector? {
    val value = get("record") as? JsonObject ?: return null
    return when (val mode = value.stringValue("mode")) {
        "latest" -> CollectionRecordSelector(mode = mode)
        "specific" -> value.stringValue("recordId")
            .takeIf(String::isNotBlank)
            ?.let { CollectionRecordSelector(mode = mode, recordId = it) }
        else -> null
    }
}

private fun JsonObject.rawStringValue(key: String): String =
    (get(key) as? JsonPrimitive)?.content.orEmpty()

private fun JsonObject.submitFields(): List<SubmitDataFieldRef> {
    val fields = get("fields") as? JsonArray ?: return emptyList()
    return fields.mapNotNull { candidate ->
        val field = candidate as? JsonObject ?: return@mapNotNull null
        val fieldBlockId = field.stringValue("fieldBlockId")
        if (fieldBlockId.isBlank()) return@mapNotNull null
        SubmitDataFieldRef(
            fieldBlockId = fieldBlockId,
            targetFieldKey = field.stringValue("targetFieldKey").ifBlank { null },
        )
    }.distinctBy { it.fieldBlockId }
}
