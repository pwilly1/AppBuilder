package com.apptura.nativepreview.renderers

import android.content.Context

object RuntimeAppUserSessionStore {
    private const val PREFERENCES_NAME = "apptura_app_user_sessions"

    fun getToken(context: Context, projectId: String): String? {
        return preferences(context).getString(tokenKey(projectId), null)
    }

    fun setToken(context: Context, projectId: String, token: String) {
        preferences(context).edit().putString(tokenKey(projectId), token).apply()
    }

    fun clear(context: Context, projectId: String) {
        preferences(context).edit().remove(tokenKey(projectId)).apply()
    }

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    private fun tokenKey(projectId: String) = "project:$projectId"
}
