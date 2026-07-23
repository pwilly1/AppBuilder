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
    val isAppAuthAction = action is BlockAction.SignUpAppUser
        || action is BlockAction.LoginAppUser
        || action is BlockAction.LogoutAppUser
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
    val submitFieldsConfigured = submitAction != null
        && submitAction.fields.isNotEmpty()
        && (submitAction.collectionId == null || submitAction.fields.all { !it.targetFieldKey.isNullOrBlank() })
    val canSubmit = submitFieldsConfigured && !projectId.isNullOrBlank() && !baseUrl.isNullOrBlank() && formRuntime != null
    val canAuthenticate = isAppAuthAction
        && !projectId.isNullOrBlank()
        && !baseUrl.isNullOrBlank()
        && (action is BlockAction.LogoutAppUser || formRuntime != null)
    val showsStatus = submitAction != null || isAppAuthAction
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
            enabled = when {
                submitAction != null -> canSubmit && status != ButtonStatus.SUBMITTING
                isAppAuthAction -> canAuthenticate && status != ButtonStatus.SUBMITTING
                else -> true
            },
            onClick = {
                if (submitAction == null && !isAppAuthAction) {
                    action?.let { executeBlockTapAction(context, it, onNavigate, runtimeContext, formRuntime) }
                    return@Button
                }
                if (projectId == null || baseUrl == null) return@Button
                if (submitAction != null && (!canSubmit || formRuntime == null)) return@Button
                if (isAppAuthAction && !canAuthenticate) return@Button
                status = ButtonStatus.SUBMITTING
                errorMessage = ""
                scope.launch {
                    try {
                        when (action) {
                            is BlockAction.SubmitData -> {
                                ProjectLoader.submitPublicAppDataRecord(
                                    baseUrl = baseUrl,
                                    projectId = projectId,
                                    sourceId = block.id,
                                    values = requireNotNull(formRuntime).getFieldValues(action.fields),
                                    appUserToken = RuntimeAppUserSessionStore.getToken(context, projectId),
                                )
                            }
                            is BlockAction.SignUpAppUser -> {
                                val runtime = requireNotNull(formRuntime)
                                val email = runtime.getString(action.emailFieldBlockId)?.trim().orEmpty()
                                val password = runtime.getString(action.passwordFieldBlockId).orEmpty()
                                if (email.isBlank() || password.isBlank()) {
                                    throw IllegalArgumentException("Enter an email and password.")
                                }
                                val displayName = action.displayNameFieldBlockId
                                    ?.let(runtime::getString)
                                    ?.trim()
                                    .orEmpty()
                                val result = ProjectLoader.signupRuntimeAppUser(
                                    baseUrl = baseUrl,
                                    projectId = projectId,
                                    displayName = displayName,
                                    email = email,
                                    password = password,
                                )
                                RuntimeAppUserSessionStore.setToken(context, projectId, result.token)
                            }
                            is BlockAction.LoginAppUser -> {
                                val runtime = requireNotNull(formRuntime)
                                val email = runtime.getString(action.emailFieldBlockId)?.trim().orEmpty()
                                val password = runtime.getString(action.passwordFieldBlockId).orEmpty()
                                if (email.isBlank() || password.isBlank()) {
                                    throw IllegalArgumentException("Enter an email and password.")
                                }
                                val result = ProjectLoader.loginRuntimeAppUser(
                                    baseUrl = baseUrl,
                                    projectId = projectId,
                                    email = email,
                                    password = password,
                                )
                                RuntimeAppUserSessionStore.setToken(context, projectId, result.token)
                            }
                            BlockAction.LogoutAppUser -> {
                                RuntimeAppUserSessionStore.clear(context, projectId)
                            }
                            else -> Unit
                        }
                        status = ButtonStatus.SUCCESS
                    } catch (error: Exception) {
                        status = ButtonStatus.ERROR
                        errorMessage = error.message ?: "Action failed."
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
                text = if (status == ButtonStatus.SUBMITTING) {
                    when (action) {
                        is BlockAction.SignUpAppUser -> "Creating account..."
                        is BlockAction.LoginAppUser -> "Signing in..."
                        BlockAction.LogoutAppUser -> "Signing out..."
                        else -> "Submitting..."
                    }
                } else {
                    label
                },
                fontSize = previewSp(scaledFontSize),
                lineHeight = previewSp(scaledFontSize * 1.2f),
                style = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false)),
            )
        }
        if (showsStatus && status == ButtonStatus.SUCCESS) {
            Text(
                text = when (action) {
                    is BlockAction.SignUpAppUser -> "Account created."
                    is BlockAction.LoginAppUser -> "Signed in."
                    BlockAction.LogoutAppUser -> "Signed out."
                    else -> successMessage
                },
                fontSize = previewSp(12f),
                color = Color(0xFF047857),
                modifier = Modifier.padding(top = 6.dp),
            )
        }
        if (showsStatus && status == ButtonStatus.ERROR) {
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
