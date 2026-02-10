// © 2025 Preston Willis. All rights reserved.
package com.apptura.nativepreview

import android.content.Context
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Button
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import com.apptura.nativepreview.navigation.ProjectPreviewScreen
import com.apptura.nativepreview.models.ProjectLoader
import com.apptura.nativepreview.models.Project
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import java.io.PrintWriter
import java.io.StringWriter

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        installCrashCapture()

        setContent {
            MaterialTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    val scope = rememberCoroutineScope()

                    // For Android emulator to reach your host machine.
                    // If you run on a physical device, change this to your computer's LAN IP.
                    val baseUrl = "http://10.0.2.2:3000"
                    val isProbablyEmulator = remember {
                        Build.FINGERPRINT.contains("generic") ||
                            Build.MODEL.contains("Emulator") ||
                            Build.MODEL.contains("Android SDK built for")
                    }

                    var username by remember { mutableStateOf("") }
                    var password by remember { mutableStateOf("") }
                    var token by remember { mutableStateOf<String?>(null) }

                    var loading by remember { mutableStateOf(false) }
                    var error by remember { mutableStateOf<String?>(null) }
                    var backendStatus by remember { mutableStateOf<String?>(null) }
                    var lastCrash by remember { mutableStateOf<String?>(null) }

                    var projects by remember { mutableStateOf<List<Project>>(emptyList()) }
                    var project by remember { mutableStateOf<Project?>(null) }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                    ) {
                        LaunchedEffect(Unit) {
                            lastCrash = readAndClearLastCrash()
                        }

                        if (!lastCrash.isNullOrBlank()) {
                            Text(text = "Last crash:")
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = lastCrash!!)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                enabled = !loading,
                                onClick = { lastCrash = null }
                            ) {
                                Text("Dismiss")
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        Text(text = "Backend: $baseUrl")
                        if (!isProbablyEmulator) {
                            Text(text = "Note: 10.0.2.2 only works on the emulator. On a physical device, set baseUrl to your computer's LAN IP.")
                        }
                        if (backendStatus != null) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = backendStatus!!)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(modifier = Modifier.fillMaxWidth()) {
                            Button(
                                enabled = !loading,
                                onClick = {
                                    scope.launch {
                                        loading = true
                                        error = null
                                        backendStatus = null
                                        try {
                                            val ok = ProjectLoader.healthCheck(baseUrl)
                                            backendStatus = if (ok) "Backend OK" else "Backend health check failed"
                                        } catch (e: Exception) {
                                            error = e.message ?: "Failed to reach backend"
                                        } finally {
                                            loading = false
                                        }
                                    }
                                }
                            ) {
                                Text(if (loading) "Testing…" else "Test backend")
                            }

                            if (token != null) {
                                Spacer(modifier = Modifier.weight(1f))
                                Button(
                                    enabled = !loading,
                                    onClick = {
                                        token = null
                                        project = null
                                        projects = emptyList()
                                        error = null
                                        backendStatus = null
                                        username = ""
                                        password = ""
                                    }
                                ) {
                                    Text("Logout")
                                }
                            }
                        }

                        if (error != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "Error: ${error}")
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (token == null) {
                            Text(text = "Sign in", style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(8.dp))

                            OutlinedTextField(
                                value = username,
                                onValueChange = { username = it.trim() },
                                label = { Text("Username") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
                                modifier = Modifier.fillMaxWidth()
                            )

                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                label = { Text("Password") },
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                enabled = !loading,
                                onClick = {
                                    if (username.isBlank() || password.isBlank()) {
                                        error = "Username and password are required"
                                        return@Button
                                    }
                                    scope.launch {
                                        loading = true
                                        error = null
                                        try {
                                            val t = ProjectLoader.login(baseUrl, username, password)
                                            token = t
                                            projects = ProjectLoader.listProjects(baseUrl, t)
                                        } catch (e: Exception) {
                                            error = e.message ?: "Login failed"
                                        } finally {
                                            loading = false
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(if (loading) "Signing in…" else "Sign in")
                            }
                        } else if (project == null) {
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "Your Projects",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.weight(1f)
                                )
                                Button(
                                    enabled = !loading,
                                    onClick = {
                                        scope.launch {
                                            loading = true
                                            error = null
                                            try {
                                                projects = ProjectLoader.listProjects(baseUrl, token!!)
                                            } catch (e: Exception) {
                                                error = e.message ?: "Failed to load projects"
                                            } finally {
                                                loading = false
                                            }
                                        }
                                    }
                                ) {
                                    Text("Refresh")
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))

                            if (projects.isEmpty()) {
                                Text("No projects found for this account")
                            } else {
                                LazyColumn(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(projects) { p ->
                                        Row(modifier = Modifier.fillMaxWidth()) {
                                            Text(
                                                text = p.name ?: "Untitled",
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .padding(end = 12.dp)
                                            )
                                            Button(
                                                enabled = !loading,
                                                onClick = {
                                                    val id = p.id
                                                    if (id.isNullOrBlank()) {
                                                        error = "Project has no id"
                                                        return@Button
                                                    }
                                                    scope.launch {
                                                        loading = true
                                                        error = null
                                                        try {
                                                            project = ProjectLoader.loadFromBackend(baseUrl, id, token!!)
                                                        } catch (e: Exception) {
                                                            error = e.message ?: "Failed to load project"
                                                        } finally {
                                                            loading = false
                                                        }
                                                    }
                                                }
                                            ) {
                                                Text(if (loading) "Loading…" else "Open")
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Button(
                                    enabled = !loading,
                                    onClick = { project = null },
                                ) {
                                    Text("Back")
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f)
                            ) {
                                ProjectPreviewScreen(project!!)
                            }
                        }
                    }
                }
            }
        }
    }

    private fun crashPrefs() = getSharedPreferences("nativepreview", Context.MODE_PRIVATE)

    private fun installCrashCapture() {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { t, e ->
            try {
                val sw = StringWriter()
                val pw = PrintWriter(sw)
                pw.println("Thread: ${t.name}")
                e.printStackTrace(pw)
                pw.flush()
                crashPrefs().edit().putString("last_crash", sw.toString()).apply()
            } catch (_: Exception) {
                // ignore
            } finally {
                previous?.uncaughtException(t, e)
            }
        }
    }

    private fun readAndClearLastCrash(): String? {
        val prefs = crashPrefs()
        val text = prefs.getString("last_crash", null)
        if (!text.isNullOrBlank()) prefs.edit().remove("last_crash").apply()
        return text
    }
}
