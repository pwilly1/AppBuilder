package com.apptura.nativepreview.renderers

import androidx.compose.runtime.mutableStateMapOf
import kotlinx.serialization.json.JsonPrimitive

class FormRuntimeState {
    private val valuesByBlockId = mutableStateMapOf<String, JsonPrimitive>()
    private val fieldKeysByBlockId = mutableStateMapOf<String, String>()

    fun getString(fieldBlockId: String): String? = valuesByBlockId[fieldBlockId]?.content

    fun getBoolean(fieldBlockId: String): Boolean? =
        valuesByBlockId[fieldBlockId]?.content?.toBooleanStrictOrNull()

    fun setString(fieldKey: String, value: String, fieldBlockId: String) {
        valuesByBlockId[fieldBlockId] = JsonPrimitive(value)
        fieldKeysByBlockId[fieldBlockId] = fieldKey
    }

    fun setBoolean(fieldKey: String, value: Boolean, fieldBlockId: String) {
        valuesByBlockId[fieldBlockId] = JsonPrimitive(value)
        fieldKeysByBlockId[fieldBlockId] = fieldKey
    }

    fun getFieldValue(fieldBlockId: String): JsonPrimitive? = valuesByBlockId[fieldBlockId]

    fun getFieldValues(fields: List<SubmitDataFieldRef>): Map<String, JsonPrimitive> = fields.mapNotNull { field ->
        valuesByBlockId[field.fieldBlockId]?.let { value ->
            (field.targetFieldKey ?: field.fieldBlockId) to value
        }
    }.toMap()
}

fun resolveFieldKey(blockId: String, label: String?, explicitKey: String?): String {
    val raw = explicitKey?.trim().takeUnless { it.isNullOrBlank() }
        ?: label?.trim().takeUnless { it.isNullOrBlank() }
        ?: blockId
    return slugifyRuntimeKey(raw).ifBlank { blockId }
}

private fun slugifyRuntimeKey(value: String): String = value
    .lowercase()
    .replace(Regex("[^a-z0-9]+"), "_")
    .trim('_')
