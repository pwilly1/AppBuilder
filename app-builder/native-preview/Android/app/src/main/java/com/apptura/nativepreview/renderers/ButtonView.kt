package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.ProjectLoader
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun ButtonView(
    block: Block,
    projectId: String? = null,
    baseUrl: String? = null,
    formRuntime: FormRuntimeState? = null,
    runtimeContext: RuntimeContext = RuntimeContext(),
    onNavigate: ((String) -> Unit)? = null,
) {
    val label = (block.props["label"] as? JsonPrimitive)?.content ?: "Button"
    val action = resolveBlockAction(block)
    val submitAction = action as? BlockAction.SubmitData
    val submitGroupId = resolveSubmitGroupId(submitAction?.submitGroupId)
    val successMessage = (block.props["successMessage"] as? JsonPrimitive)?.content ?: "Submission received."
    val fontSize = (block.props["fontSize"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 14.0
    val contentPadding = (block.props["contentPadding"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 12.0
    val buttonPaddingX = (block.props["buttonPaddingX"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 14.0
    val buttonPaddingY = (block.props["buttonPaddingY"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 10.0
    val borderRadius = (block.props["borderRadius"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 10.0
    val backgroundColor = parseButtonColor((block.props["backgroundColor"] as? JsonPrimitive)?.content, Color(0xFF2563EB))
    val textColor = parseButtonColor((block.props["textColor"] as? JsonPrimitive)?.content, Color.White)
    val contentScale = getBlockContentScale(block)
    val scaledFontSize = fontSize.toFloat() * contentScale
    val canSubmit = submitAction != null && !projectId.isNullOrBlank() && !baseUrl.isNullOrBlank() && formRuntime != null
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var status by remember(block.id) { mutableStateOf(ButtonStatus.IDLE) }
    var errorMessage by remember(block.id) { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding((contentPadding.toFloat() * contentScale).dp)
    ) {
        Button(
            enabled = submitAction == null || (canSubmit && status != ButtonStatus.SUBMITTING),
            onClick = {
                if (submitAction == null) {
                    action?.let { executeBlockTapAction(context, it, onNavigate, runtimeContext, formRuntime) }
                    return@Button
                }
                if (!canSubmit || projectId == null || baseUrl == null || formRuntime == null) return@Button
                status = ButtonStatus.SUBMITTING
                errorMessage = ""
                scope.launch {
                    try {
                        ProjectLoader.submitPublicAppDataRecord(
                            baseUrl = baseUrl,
                            projectId = projectId,
                            sourceId = block.id,
                            values = formRuntime.getGroupValues(submitGroupId),
                        )
                        status = ButtonStatus.SUCCESS
                    } catch (error: Exception) {
                        status = ButtonStatus.ERROR
                        errorMessage = error.message ?: "Submission failed."
                    }
                }
            },
            contentPadding = PaddingValues(
                start = (buttonPaddingX.toFloat() * contentScale).dp,
                top = (buttonPaddingY.toFloat() * contentScale).dp,
                end = (buttonPaddingX.toFloat() * contentScale).dp,
                bottom = (buttonPaddingY.toFloat() * contentScale).dp,
            ),
            shape = RoundedCornerShape((borderRadius.toFloat() * contentScale).dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = backgroundColor,
                contentColor = textColor,
            ),
        ) {
            Text(
                text = if (status == ButtonStatus.SUBMITTING) "Submitting..." else label,
                fontSize = previewSp(scaledFontSize),
                lineHeight = previewSp(scaledFontSize * 1.2f),
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
            )
        }
        if (submitAction != null && status == ButtonStatus.SUCCESS) {
            Text(
                text = successMessage,
                fontSize = previewSp(12f),
                color = Color(0xFF047857),
                modifier = Modifier.padding(top = 6.dp),
            )
        }
        if (submitAction != null && status == ButtonStatus.ERROR) {
            Text(
                text = errorMessage,
                fontSize = previewSp(12f),
                color = Color(0xFFDC2626),
                modifier = Modifier.padding(top = 6.dp),
            )
        }
    }
}

private enum class ButtonStatus {
    IDLE,
    SUBMITTING,
    SUCCESS,
    ERROR,
}

private fun parseButtonColor(raw: String?, fallback: Color): Color {
    val value = raw?.trim()
    if (value.isNullOrBlank()) return fallback
    return try {
        Color(android.graphics.Color.parseColor(value))
    } catch (_: IllegalArgumentException) {
        fallback
    }
}
