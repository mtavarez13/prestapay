package com.prestapay.mobile.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.sessionDataStore by preferencesDataStore("prestapay_session")
class SessionStore(private val context: Context) {
    private val tenantKey = stringPreferencesKey("active_tenant_id")
    suspend fun tenantId(): String? = context.sessionDataStore.data.first()[tenantKey]
    suspend fun saveTenantId(value: String) { context.sessionDataStore.edit { it[tenantKey] = value } }
    suspend fun clear() { context.sessionDataStore.edit { it.clear() } }
}
