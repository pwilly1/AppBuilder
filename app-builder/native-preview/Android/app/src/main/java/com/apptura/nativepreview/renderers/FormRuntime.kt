package com.apptura.nativepreview.renderers

import androidx.compose.runtime.mutableStateMapOf
import kotlinx.serialization.json.JsonPrimitive

class FormRuntimeState {
    private val values = mutableStateMapOf<String, Map<String, JsonPrimitive>>()
    private val valuesByBlockId = mutableStateMapOf<String, JsonPrimitive>()

    fun getString(fieldKey: String, submitGroupId: String): String? =
        values[resolveSubmitGroupId(submitGroupId)]
            ?.get(fieldKey)
            ?.content

    fun getBoolean(fieldKey: String, submitGroupId: String): Boolean? =
        values[resolveSubmitGroupId(submitGroupId)]
            ?.get(fieldKey)
            ?.content
            ?.toBooleanStrictOrNull()

    fun setString(fieldKey: String, value: String, submitGroupId: String, fieldBlockId: String? = null) {
        setValue(fieldKey, JsonPrimitive(value), submitGroupId)
        if (!fieldBlockId.isNullOrBlank()) valuesByBlockId[fieldBlockId] = JsonPrimitive(value)
    }

    fun setBoolean(fieldKey: String, value: Boolean, submitGroupId: String, fieldBlockId: String? = null) {
        setValue(fieldKey, JsonPrimitive(value), submitGroupId)
        if (!fieldBlockId.isNullOrBlank()) valuesByBlockId[fieldBlockId] = JsonPrimitive(value)
    }

    fun getFieldValue(fieldBlockId: String): JsonPrimitive? = valuesByBlockId[fieldBlockId]

    fun getGroupValues(submitGroupId: String): Map<String, JsonPrimitive> =
        values[resolveSubmitGroupId(submitGroupId)].orEmpty()

    private fun setValue(fieldKey: String, value: JsonPrimitive, submitGroupId: String) {
        val groupId = resolveSubmitGroupId(submitGroupId)
        values[groupId] = values[groupId].orEmpty() + (fieldKey to value)
    }
}

fun resolveFieldKey(blockId: String, label: String?, explicitKey: String?): String {
    val raw = explicitKey?.trim().takeUnless { it.isNullOrBlank() }
        ?: label?.trim().takeUnless { it.isNullOrBlank() }
        ?: blockId
    return slugifyRuntimeKey(raw).ifBlank { blockId }
}

fun resolveSubmitGroupId(submitGroupId: String?): String =
    slugifyRuntimeKey(submitGroupId?.trim().takeUnless { it.isNullOrBlank() } ?: "default")
        .ifBlank { "default" }

private fun slugifyRuntimeKey(value: String): String = value
    .lowercase()
    .replace(Regex("[^a-z0-9]+"), "_")
    .trim('_')
