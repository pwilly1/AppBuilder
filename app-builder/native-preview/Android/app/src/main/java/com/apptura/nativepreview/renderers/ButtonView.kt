package com.apptura.nativepreview.renderers

import android.app.AlertDialog
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
    val saveCurrentUserAction = action as? BlockAction.SaveCurrentUserRecord
    val deleteAction = action as? BlockAction.DeleteCurrentUserRecord
    val isRecordMutationAction = saveCurrentUserAction != null || deleteAction != null
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
    val saveCurrentUserFieldsConfigured = saveCurrentUserAction != null
        && saveCurrentUserAction.collectionId.isNotBlank()
        && saveCurrentUserAction.fields.isNotEmpty()
        && saveCurrentUserAction.fields.all { !it.targetFieldKey.isNullOrBlank() }
    val canMutate = isRecordMutationAction
        && !projectId.isNullOrBlank()
        && !baseUrl.isNullOrBlank()
        && (deleteAction != null || (saveCurrentUserFieldsConfigured && formRuntime != null))
    val canAuthenticate = isAppAuthAction
        && !projectId.isNullOrBlank()
        && !baseUrl.isNullOrBlank()
        && (action is BlockAction.LogoutAppUser || formRuntime != null)
    val showsStatus = submitAction != null || isRecordMutationAction || isAppAuthAction
    val isAsyncAction = submitAction != null || isRecordMutationAction || isAppAuthAction
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var status by remember(block.id) { mutableStateOf(ButtonStatus.IDLE) }
    var errorMessage by remember(block.id) { mutableStateOf("") }
    val runAsyncAction = {
        if (projectId != null && baseUrl != null) {
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
                            runtimeContext.refreshCollectionData()
                        }
                        is BlockAction.SaveCurrentUserRecord -> {
                            val token = RuntimeAppUserSessionStore.getToken(context, projectId)
                                ?: throw IllegalStateException("Sign in before changing saved data.")
                            ProjectLoader.saveCurrentAppUserCollectionRecord(
                                baseUrl = baseUrl,
                                projectId = projectId,
                                collectionId = action.collectionId,
                                values = requireNotNull(formRuntime).getFieldValues(action.fields),
                                appUserToken = token,
                            )
                            runtimeContext.refreshCollectionData()
                        }
                        is BlockAction.DeleteCurrentUserRecord -> {
                            val token = RuntimeAppUserSessionStore.getToken(context, projectId)
                                ?: throw IllegalStateException("Sign in before changing saved data.")
                            val record = ProjectLoader.listCurrentAppUserCollectionRecords(
                                baseUrl = baseUrl,
                                projectId = projectId,
                                collectionId = action.collectionId,
                                appUserToken = token,
                            ).firstOrNull() ?: throw IllegalStateException("No saved data was found for this app user.")
                            ProjectLoader.deleteCurrentAppUserCollectionRecord(
                                baseUrl = baseUrl,
                                projectId = projectId,
                                collectionId = action.collectionId,
                                recordId = record.id,
                                appUserToken = token,
                            )
                            runtimeContext.refreshCollectionData()
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
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding((contentPadding.toFloat() * contentScale).dp)
    ) {
        Button(
            enabled = when {
                submitAction != null -> canSubmit && status != ButtonStatus.SUBMITTING
                isRecordMutationAction -> canMutate && status != ButtonStatus.SUBMITTING
                isAppAuthAction -> canAuthenticate && status != ButtonStatus.SUBMITTING
                else -> true
            },
            onClick = {
                if (!isAsyncAction) {
                    action?.let { executeBlockTapAction(context, it, onNavigate, runtimeContext, formRuntime) }
                    return@Button
                }
                if (submitAction != null && !canSubmit) return@Button
                if (isRecordMutationAction && !canMutate) return@Button
                if (isAppAuthAction && !canAuthenticate) return@Button
                if (deleteAction != null) {
                    AlertDialog.Builder(context)
                        .setTitle("Delete saved data?")
                        .setMessage("This permanently deletes your newest saved record.")
                        .setNegativeButton("Cancel", null)
                        .setPositiveButton("Delete") { _, _ -> runAsyncAction() }
                        .show()
                } else {
                    runAsyncAction()
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
                        is BlockAction.SaveCurrentUserRecord -> "Saving..."
                        is BlockAction.DeleteCurrentUserRecord -> "Deleting..."
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
                    is BlockAction.SaveCurrentUserRecord -> if (successMessage == "Submission received.") {
                        "Changes saved."
                    } else {
                        successMessage
                    }
                    is BlockAction.DeleteCurrentUserRecord -> "Data deleted."
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
