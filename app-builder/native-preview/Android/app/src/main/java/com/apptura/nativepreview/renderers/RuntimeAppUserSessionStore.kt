package com.apptura.nativepreview.renderers

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember

object RuntimeAppUserSessionStore {
    private const val PREFERENCES_NAME = "apptura_app_user_sessions"
    private val revisions = mutableStateMapOf<String, Int>()

    fun getToken(context: Context, projectId: String): String? {
        return preferences(context).getString(tokenKey(projectId), null)
    }

    @Composable
    fun observeToken(context: Context, projectId: String?): String? {
        if (projectId.isNullOrBlank()) return null
        val revision = revisions[projectId] ?: 0
        return remember(context, projectId, revision) { getToken(context, projectId) }
    }

    fun setToken(context: Context, projectId: String, token: String) {
        preferences(context).edit().putString(tokenKey(projectId), token).apply()
        revisions[projectId] = (revisions[projectId] ?: 0) + 1
    }

    fun clear(context: Context, projectId: String) {
        preferences(context).edit().remove(tokenKey(projectId)).apply()
        revisions[projectId] = (revisions[projectId] ?: 0) + 1
    }

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    private fun tokenKey(projectId: String) = "project:$projectId"
}
