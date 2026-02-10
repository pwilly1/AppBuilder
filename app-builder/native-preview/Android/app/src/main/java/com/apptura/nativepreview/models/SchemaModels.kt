// © 2025 Preston Willis. All rights reserved.
// Opting into InternalSerializationApi for the file
@file:OptIn(kotlinx.serialization.InternalSerializationApi::class)

package com.apptura.nativepreview.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import android.content.Context

@Serializable
data class Block(
    val id: String,
    val type: String,
    val props: JsonObject = buildJsonObject { }
)

@Serializable
data class Page(
    val id: String,
    val title: String? = null,
    val name: String? = null,
    val path: String? = null,
    val blocks: List<Block> = emptyList()
)

@Serializable
data class Project(
    val id: String? = null,
    val name: String? = null,
    val pages: List<Page> = emptyList()
)

@Serializable
private data class TokenResponse(val token: String)

@Serializable
private data class LoginRequest(val username: String, val password: String)

object ProjectLoader {
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    fun loadFromAssets(context: Context, fileName: String): Project {
        val input = context.assets.open(fileName)
        val content = input.bufferedReader().use { it.readText() }
        return json.decodeFromString<Project>(content)
    }

    suspend fun createGuestToken(baseUrl: String): String {
        val body = httpGet(normalizeBaseUrl(baseUrl) + "/auth/createGuestSession", token = null)
        return json.decodeFromString<TokenResponse>(body).token
    }

    suspend fun login(baseUrl: String, username: String, password: String): String {
        val req = LoginRequest(username = username, password = password)
        val body = httpPostJson(
            normalizeBaseUrl(baseUrl) + "/auth/login",
            json.encodeToString(req),
            token = null
        )
        return json.decodeFromString<TokenResponse>(body).token
    }

    suspend fun listProjects(baseUrl: String, token: String): List<Project> {
        val body = httpGet(normalizeBaseUrl(baseUrl) + "/projects", token = token)
        return json.decodeFromString(body)
    }

    suspend fun healthCheck(baseUrl: String): Boolean {
        val body = httpGet(normalizeBaseUrl(baseUrl) + "/auth/health", token = null)
        return try {
            val el = json.decodeFromString<JsonElement>(body)
            el.jsonObject["ok"]?.jsonPrimitive?.content == "true"
        } catch (_: Exception) {
            false
        }
    }

    suspend fun loadFromBackend(baseUrl: String, projectId: String, token: String): Project {
        val body = httpGet(normalizeBaseUrl(baseUrl) + "/projects/" + projectId, token = token)
        return json.decodeFromString<Project>(body)
    }

    private fun normalizeBaseUrl(baseUrl: String): String = baseUrl.trim().removeSuffix("/")

    private suspend fun httpGet(url: String, token: String?): String {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            val conn = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10_000
                readTimeout = 20_000
                setRequestProperty("Accept", "application/json")
                if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
            }

            try {
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else (conn.errorStream ?: conn.inputStream)
                val text = stream.bufferedReader().use { it.readText() }
                if (code !in 200..299) {
                    // backend shape: { error: "..." }
                    val msg = try {
                        val el = json.decodeFromString<JsonElement>(text)
                        el.jsonObject["error"]?.jsonPrimitive?.content
                    } catch (_: Exception) {
                        null
                    }
                    throw IllegalStateException(msg ?: "HTTP $code")
                }
                text
            } finally {
                conn.disconnect()
            }
        }
    }

    private suspend fun httpPostJson(url: String, bodyJson: String, token: String?): String {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            val conn = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 10_000
                readTimeout = 20_000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
            }

            try {
                conn.outputStream.use { it.write(bodyJson.toByteArray(Charsets.UTF_8)) }

                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else (conn.errorStream ?: conn.inputStream)
                val text = stream.bufferedReader().use { it.readText() }
                if (code !in 200..299) {
                    val msg = try {
                        val el = json.decodeFromString<JsonElement>(text)
                        el.jsonObject["error"]?.jsonPrimitive?.content
                    } catch (_: Exception) {
                        null
                    }
                    throw IllegalStateException(msg ?: "HTTP $code")
                }
                text
            } finally {
                conn.disconnect()
            }
        }
    }
}
