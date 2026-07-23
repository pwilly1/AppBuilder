// Opting into InternalSerializationApi for the file
@file:OptIn(kotlinx.serialization.InternalSerializationApi::class)

package com.apptura.nativepreview.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import android.content.Context

@Serializable
data class Block(
    val id: String,
    val type: String,
    val parentId: String? = null,
    val props: JsonObject = buildJsonObject { },
    val bindings: Map<String, RuntimeValueRef> = emptyMap(),
    val layout: BlockRuntimeLayout? = null,
    val render: BlockRenderMetadata? = null
)

@Serializable
data class CollectionRecordSelector(
    val mode: String = "latest",
    val recordId: String? = null,
)

@Serializable
data class RuntimeValueRef(
    val source: String,
    val value: String? = null,
    val variableId: String? = null,
    val collectionId: String? = null,
    val fieldId: String? = null,
    val record: CollectionRecordSelector? = null,
    val fieldBlockId: String? = null,
    val fallback: String? = null,
)

@Serializable
data class PageStateVariable(
    val id: String,
    val name: String,
    val type: String = "text",
    val initialValue: String = "",
)

@Serializable
data class PageAppearance(
    val backgroundColor: String? = null,
)

@Serializable
data class AppDataCollectionField(
    val id: String,
    val key: String,
    val label: String,
    val type: String,
    val required: Boolean = false,
)

@Serializable
data class AppDataCollection(
    val id: String,
    val name: String,
    val publicRead: Boolean = false,
    val fields: List<AppDataCollectionField> = emptyList(),
)

@Serializable
data class GridPlacement(
    val colStart: Int,
    val rowStart: Int,
    val colSpan: Int,
    val rowSpan: Int
)

@Serializable
data class ContentScaleBase(
    val colSpan: Int,
    val rowSpan: Int
)

@Serializable
data class BlockRuntimeLayout(
    val grid: GridPlacement? = null,
    val resizeBehavior: String? = null,
    val scaleBase: ContentScaleBase? = null
)

@Serializable
data class BlockRenderMetadata(
    val widthPx: Float? = null,
    val heightPx: Float? = null,
    val offsetX: Float? = null,
    val offsetY: Float? = null,
    val alignX: String? = null,
    val alignY: String? = null
)

@Serializable
data class Page(
    val id: String,
    val title: String? = null,
    val name: String? = null,
    val path: String? = null,
    val appearance: PageAppearance? = null,
    val stateVariables: List<PageStateVariable> = emptyList(),
    val blocks: List<Block> = emptyList()
)

@Serializable
data class Project(
    val schemaVersion: Int? = null,
    val id: String? = null,
    val name: String? = null,
    val dataCollections: List<AppDataCollection> = emptyList(),
    val pages: List<Page> = emptyList()
)

@Serializable
private data class TokenResponse(val token: String)

@Serializable
private data class LoginRequest(val username: String, val password: String)

@Serializable
private data class AppUserSignupRequest(
    val displayName: String = "",
    val email: String,
    val password: String,
)

@Serializable
private data class AppUserLoginRequest(val email: String, val password: String)

@Serializable
data class RuntimeAppUser(
    val id: String,
    val projectId: String,
    val displayName: String = "",
    val email: String,
    val createdAt: String? = null,
)

@Serializable
data class AppUserAuthResponse(
    val token: String,
    val user: RuntimeAppUser,
)

@Serializable
data class PublicFormSubmissionRequest(
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val message: String? = null
)

@Serializable
data class AppDataRecord(
    val id: String,
    val sourceId: String? = null,
    val data: JsonObject = buildJsonObject { },
    val submittedAt: String? = null,
)

object ProjectLoader {
    private const val GRID_DENSITY_SCHEMA_VERSION = 2
    private const val EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION = 5
    private const val UNIFIED_TEXT_FIELD_SCHEMA_VERSION = 6
    private const val CURRENT_SCHEMA_VERSION = UNIFIED_TEXT_FIELD_SCHEMA_VERSION

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    fun loadFromAssets(context: Context, fileName: String): Project {
        val input = context.assets.open(fileName)
        val content = input.bufferedReader().use { it.readText() }
        return migrateProjectGridDensity(json.decodeFromString<Project>(content))
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
        return migrateProjectGridDensity(json.decodeFromString<Project>(body))
    }

    suspend fun submitPublicProjectForm(
        baseUrl: String,
        projectId: String,
        blockId: String,
        request: PublicFormSubmissionRequest
    ) {
        httpPostJson(
            normalizeBaseUrl(baseUrl) + "/public/projects/$projectId/forms/$blockId/submissions",
            json.encodeToString(request),
            token = null
        )
    }

    private fun normalizeBaseUrl(baseUrl: String): String = baseUrl.trim().removeSuffix("/")

    private fun migrateProjectGridDensity(project: Project): Project {
        val scaleGrid = (project.schemaVersion ?: 1) < GRID_DENSITY_SCHEMA_VERSION
        val migrateLegacySubmissionGroups = (project.schemaVersion ?: 1) < EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION
        return project.copy(
            schemaVersion = CURRENT_SCHEMA_VERSION,
            pages = project.pages.map { page ->
                val textFieldsMigrated = page.blocks.map(::migrateLegacyTextField)
                val legacyButtonsMigrated = textFieldsMigrated.map(::migrateLegacyButton)
                val submissionFieldsMigrated = if (migrateLegacySubmissionGroups) {
                    migrateExplicitSubmitFields(legacyButtonsMigrated)
                } else {
                    legacyButtonsMigrated
                }
                page.copy(
                    blocks = submissionFieldsMigrated.map blockMap@ { converted ->
                        val grid = converted.layout?.grid
                        if (!scaleGrid || grid == null) return@blockMap converted
                        converted.copy(
                            layout = converted.layout.copy(
                                grid = GridPlacement(
                                    colStart = (grid.colStart - 1) * 2 + 1,
                                    rowStart = (grid.rowStart - 1) * 2 + 1,
                                    colSpan = grid.colSpan * 2,
                                    rowSpan = grid.rowSpan * 2
                                )
                            )
                        )
                    }
                )
            }
        )
    }

    private fun migrateLegacyTextField(block: Block): Block {
        if (block.type != "input" && block.type != "textarea") return block

        val multiline = block.type == "textarea"
        val label = (block.props["label"] as? JsonPrimitive)?.content?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: if (multiline) "Message" else "Label"
        val props = buildJsonObject {
            put("value", block.props["value"] ?: JsonPrimitive(""))
            put("fontSize", block.props["fontSize"] ?: JsonPrimitive(14))
            put("contentPadding", JsonPrimitive(8))
            put("textColor", block.props["textColor"] ?: JsonPrimitive("#0f172a"))
            put("editable", JsonPrimitive(true))
            put("textInputMode", JsonPrimitive(if (multiline) "multiline" else "singleLine"))
            put(
                "inputType",
                if (!multiline) block.props["inputType"] ?: JsonPrimitive("text") else JsonPrimitive("text"),
            )
            put("fieldLabel", JsonPrimitive(label))
            put("showFieldLabel", JsonPrimitive(true))
            put("fieldKey", block.props["fieldKey"] ?: JsonPrimitive(""))
            put("required", block.props["required"] ?: JsonPrimitive(false))
            put(
                "placeholder",
                block.props["placeholder"]
                    ?: JsonPrimitive(if (multiline) "Write something..." else "Placeholder"),
            )
            put("backgroundColor", block.props["backgroundColor"] ?: JsonPrimitive("#ffffff"))
            put("placeholderColor", block.props["placeholderColor"] ?: JsonPrimitive("#94a3b8"))
            put("borderColor", block.props["borderColor"] ?: JsonPrimitive("#cbd5e1"))
            put("borderWidth", JsonPrimitive(1))
            put("borderRadius", block.props["borderRadius"] ?: JsonPrimitive(0))
            block.props["submitGroupId"]?.let { put("submitGroupId", it) }
        }
        return block.copy(type = "text", props = props)
    }

    private fun migrateLegacyButton(block: Block): Block {
        if (block.type != "navButton" && block.type != "submitButton") return block
        val existingAction = block.props["action"]
        val action = existingAction ?: buildJsonObject {
            if (block.type == "navButton") {
                put("type", JsonPrimitive("navigate"))
                put("targetPageId", block.props["toPageId"] ?: JsonPrimitive(""))
            } else {
                put("type", JsonPrimitive("submitData"))
                put("submitGroupId", block.props["submitGroupId"] ?: JsonPrimitive("default"))
                block.props["collectionId"]?.let { put("collectionId", it) }
            }
        }
        val props = buildJsonObject {
            block.props.forEach { (key, value) ->
                if (key != "toPageId") put(key, value)
            }
            put("action", action)
            if (block.props["label"] == null) {
                put("label", JsonPrimitive(if (block.type == "submitButton") "Submit" else "Go"))
            }
        }
        return block.copy(type = "button", props = props)
    }

    private fun migrateExplicitSubmitFields(blocks: List<Block>): List<Block> = blocks.map { block ->
        val action = block.props["action"] as? JsonObject
        val isSubmitButton = block.type == "button"
            && (action?.get("type") as? JsonPrimitive)?.content == "submitData"

        val nextProps = buildJsonObject {
            block.props.forEach { (key, value) ->
                if (key != "submitGroupId" && key != "collectionId") put(key, value)
            }

            if (isSubmitButton && action != null) {
                val existingFields = (action["fields"] as? JsonArray)
                    ?.filterIsInstance<JsonObject>()
                    ?.filter { (it["fieldBlockId"] as? JsonPrimitive)?.content?.isNotBlank() == true }
                    .orEmpty()
                val submitGroupId = (action["submitGroupId"] as? JsonPrimitive)?.content?.trim()
                    ?.takeIf { it.isNotBlank() }
                    ?: (block.props["submitGroupId"] as? JsonPrimitive)?.content?.trim()
                        ?.takeIf { it.isNotBlank() }
                    ?: "default"
                val fields = if (existingFields.isNotEmpty()) {
                    existingFields
                } else {
                    blocks
                        .filter(::isSubmissionFieldBlock)
                        .filter { candidate ->
                            val candidateGroup = (candidate.props["submitGroupId"] as? JsonPrimitive)
                                ?.content?.trim()?.takeIf { it.isNotBlank() } ?: "default"
                            candidateGroup == submitGroupId
                        }
                        .map { candidate ->
                            buildJsonObject {
                                put("fieldBlockId", JsonPrimitive(candidate.id))
                                val fieldKey = (candidate.props["fieldKey"] as? JsonPrimitive)?.content?.trim().orEmpty()
                                if (fieldKey.isNotBlank()) put("targetFieldKey", JsonPrimitive(fieldKey))
                            }
                        }
                }
                val collectionId = (action["collectionId"] as? JsonPrimitive)?.content?.trim()
                    ?.takeIf { it.isNotBlank() }
                    ?: (block.props["collectionId"] as? JsonPrimitive)?.content?.trim()
                        ?.takeIf { it.isNotBlank() }

                put("action", buildJsonObject {
                    put("type", JsonPrimitive("submitData"))
                    put("fields", JsonArray(fields))
                    if (!collectionId.isNullOrBlank()) put("collectionId", JsonPrimitive(collectionId))
                })
            }
        }

        if (isSubmitButton || isSubmissionFieldBlock(block)) block.copy(props = nextProps) else block
    }

    private fun isSubmissionFieldBlock(block: Block): Boolean {
        if (block.type == "checkbox" || block.type == "toggle") return true
        return block.type == "text"
            && (block.props["editable"] as? JsonPrimitive)?.content?.toBooleanStrictOrNull() == true
    }

    suspend fun signupRuntimeAppUser(
        baseUrl: String,
        projectId: String,
        displayName: String,
        email: String,
        password: String,
    ): AppUserAuthResponse {
        val body = httpPostJson(
            normalizeBaseUrl(baseUrl) + "/public/projects/$projectId/app-auth/signup",
            json.encodeToString(AppUserSignupRequest(displayName, email, password)),
            token = null,
        )
        return json.decodeFromString(body)
    }

    suspend fun loginRuntimeAppUser(
        baseUrl: String,
        projectId: String,
        email: String,
        password: String,
    ): AppUserAuthResponse {
        val body = httpPostJson(
            normalizeBaseUrl(baseUrl) + "/public/projects/$projectId/app-auth/login",
            json.encodeToString(AppUserLoginRequest(email, password)),
            token = null,
        )
        return json.decodeFromString(body)
    }

    suspend fun submitPublicAppDataRecord(
        baseUrl: String,
        projectId: String,
        sourceId: String,
        values: Map<String, JsonPrimitive>,
        appUserToken: String? = null,
    ) {
        httpPostJson(
            normalizeBaseUrl(baseUrl) + "/public/projects/$projectId/app-data/sources/$sourceId/records",
            JsonObject(values).toString(),
            token = appUserToken,
        )
    }

    suspend fun getLatestPublicCollectionRecord(
        baseUrl: String,
        projectId: String,
        collectionId: String,
    ): AppDataRecord? {
        val body = httpGet(
            normalizeBaseUrl(baseUrl) + "/public/projects/$projectId/app-data/collections/$collectionId/records/latest",
            token = null,
        )
        return json.decodeFromString(body)
    }

    suspend fun getPublicCollectionRecord(
        baseUrl: String,
        projectId: String,
        collectionId: String,
        recordId: String,
    ): AppDataRecord {
        val body = httpGet(
            normalizeBaseUrl(baseUrl) + "/public/projects/$projectId/app-data/collections/$collectionId/records/$recordId",
            token = null,
        )
        return json.decodeFromString(body)
    }

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
                if (!token.isNullOrBlank()) {
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("X-Apptura-App-User-Token", token)
                }
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
