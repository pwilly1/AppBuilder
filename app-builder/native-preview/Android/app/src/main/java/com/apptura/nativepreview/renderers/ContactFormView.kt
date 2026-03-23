// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview.renderers

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.apptura.nativepreview.models.Block
import com.apptura.nativepreview.models.ProjectLoader
import com.apptura.nativepreview.models.PublicFormSubmissionRequest
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive

private fun booleanProp(block: Block, key: String, default: Boolean): Boolean {
    return (block.props[key] as? JsonPrimitive)?.content?.toBooleanStrictOrNull() ?: default
}

@Composable
fun ContactFormView(block: Block, projectId: String?, baseUrl: String?) {
    val title = (block.props["title"] as? JsonPrimitive)?.content ?: "Get in Touch"
    val subtitle = (block.props["subtitle"] as? JsonPrimitive)?.content ?: ""
    val submitLabel = (block.props["submitLabel"] as? JsonPrimitive)?.content ?: "Submit"
    val successMessage = (block.props["successMessage"] as? JsonPrimitive)?.content ?: "Form submitted successfully."
    val showName = booleanProp(block, "showName", true)
    val showEmail = booleanProp(block, "showEmail", true)
    val showPhone = booleanProp(block, "showPhone", true)
    val showMessage = booleanProp(block, "showMessage", true)
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var statusText by remember { mutableStateOf("") }
    var statusIsError by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }

    val canSubmit = !projectId.isNullOrBlank() && !baseUrl.isNullOrBlank()

    OutlinedCard(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            if (subtitle.isNotBlank()) {
                Text(text = subtitle, fontSize = 14.sp, modifier = Modifier.padding(top = 6.dp))
            }
            if (showName) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    enabled = canSubmit && !submitting,
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                )
            }
            if (showEmail) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    enabled = canSubmit && !submitting,
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                )
            }
            if (showPhone) {
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    enabled = canSubmit && !submitting,
                    label = { Text("Phone") },
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                )
            }
            if (showMessage) {
                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    enabled = canSubmit && !submitting,
                    minLines = 4,
                    label = { Text("Message") },
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                )
            }
            Button(
                onClick = {
                    if (!canSubmit || submitting) return@Button
                    scope.launch {
                        submitting = true
                        statusText = ""
                        statusIsError = false
                        try {
                            ProjectLoader.submitPublicProjectForm(
                                baseUrl = baseUrl!!,
                                projectId = projectId!!,
                                blockId = block.id,
                                request = PublicFormSubmissionRequest(
                                    name = name.takeIf { showName },
                                    email = email.takeIf { showEmail },
                                    phone = phone.takeIf { showPhone },
                                    message = message.takeIf { showMessage }
                                )
                            )
                            name = ""
                            email = ""
                            phone = ""
                            message = ""
                            statusText = successMessage
                        } catch (e: Exception) {
                            statusIsError = true
                            statusText = e.message ?: "Failed to submit form."
                        } finally {
                            submitting = false
                        }
                    }
                },
                enabled = canSubmit && !submitting,
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp)
            ) {
                Text(if (submitting) "Submitting..." else submitLabel)
            }
            if (statusText.isNotBlank()) {
                Text(
                    text = statusText,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }
            if (!canSubmit) {
                Text(
                    text = "This form requires a saved backend project.",
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }
        }
    }
}
