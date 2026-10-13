package com.prestapay.mobile.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore by preferencesDataStore("prestapay_session")
class SessionStore(private val context: Context) {
    private val tenantKey = stringPreferencesKey("active_tenant_id")
    private val themeKey = stringPreferencesKey("theme_mode")
    suspend fun tenantId(): String? = context.sessionDataStore.data.first()[tenantKey]
    suspend fun saveTenantId(value: String) { context.sessionDataStore.edit { it[tenantKey] = value } }
    fun themeMode(): Flow<String> = context.sessionDataStore.data.map { it[themeKey] ?: "system" }
    suspend fun saveThemeMode(value: String) { context.sessionDataStore.edit { it[themeKey] = value } }
    suspend fun clear() { context.sessionDataStore.edit { it.remove(tenantKey) } }
}
