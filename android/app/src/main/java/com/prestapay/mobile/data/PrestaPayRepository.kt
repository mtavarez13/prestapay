package com.prestapay.mobile.data

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await

class PrestaPayRepository(private val auth: FirebaseAuth, private val store: SessionStore) {
    @Volatile private var tenantId: String? = null
    private val api by lazy { ApiFactory.create(auth) { tenantId } }
    suspend fun restoreTenant(): Boolean {
        tenantId = store.tenantId()
        if (tenantId == null) {
            tenantId = api.me().memberships.firstOrNull { it.status == "active" }?.tenantId
            tenantId?.let { store.saveTenantId(it) }
        }
        return tenantId != null
    }
    suspend fun signIn(email: String, password: String) { auth.signInWithEmailAndPassword(email, password).await(); restoreTenant() }
    suspend fun signOut() { auth.signOut(); tenantId = null; store.clear() }
    fun signedIn() = auth.currentUser != null
    suspend fun summary() = api.summary()
    suspend fun clients() = api.clients().data
    suspend fun loans() = api.loans().data
    suspend fun articles() = api.articles().data
    suspend fun transactions() = api.transactions().data
}
