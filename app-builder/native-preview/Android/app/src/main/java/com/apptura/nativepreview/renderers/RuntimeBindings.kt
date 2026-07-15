package com.apptura.nativepreview.renderers

import androidx.compose.runtime.mutableStateMapOf
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.Page
import com.apptura.nativepreview.models.RuntimeValueRef
import kotlinx.serialization.json.JsonPrimitive

class RuntimeContext(initialPageState: Map<String, String> = emptyMap()) {
    val pageState = mutableStateMapOf<String, String>().apply { putAll(initialPageState) }

    fun setPageState(variableId: String, value: String) {
        if (pageState.containsKey(variableId)) pageState[variableId] = value
    }
}

fun createPageRuntimeContext(page: Page): RuntimeContext {
    return RuntimeContext(
        initialPageState = page.stateVariables
            .filter { it.id.isNotBlank() && it.type == "text" }
            .associate { it.id to it.initialValue },
    )
}

fun resolveRuntimeString(
    reference: RuntimeValueRef,
    context: RuntimeContext,
    staticFallback: String = "",
    formRuntime: FormRuntimeState? = null,
): String {
    if (reference.source == "static") return reference.value ?: staticFallback
    if (reference.source == "formValue") {
        val fieldBlockId = reference.fieldBlockId?.takeIf { it.isNotBlank() }
            ?: return reference.fallback ?: staticFallback
        return formRuntime?.getFieldValue(fieldBlockId)?.content ?: reference.fallback ?: staticFallback
    }
    if (reference.source != "pageState") return staticFallback
    val variableId = reference.variableId?.takeIf { it.isNotBlank() }
        ?: return reference.fallback ?: staticFallback
    return context.pageState[variableId] ?: reference.fallback ?: staticFallback
}

fun resolveBoundString(
    block: Block,
    propertyName: String,
    staticFallback: String,
    context: RuntimeContext,
): String {
    val reference = block.bindings[propertyName] ?: return staticFallback
    return resolveRuntimeString(reference, context, staticFallback)
}

fun readStaticString(block: Block, propertyName: String, fallback: String): String {
    return (block.props[propertyName] as? JsonPrimitive)?.content ?: fallback
}
