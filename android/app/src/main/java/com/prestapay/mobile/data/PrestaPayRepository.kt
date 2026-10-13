package com.prestapay.mobile.data

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges
import kotlinx.coroutines.tasks.await
import java.time.Instant

class PrestaPayRepository(
    private val auth: FirebaseAuth,
    private val store: SessionStore,
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    @Volatile private var tenantId: String? = null
    private val api by lazy { ApiFactory.create(auth) { tenantId } }
    private val listeners = mutableListOf<ListenerRegistration>()

    suspend fun restoreTenant(): Boolean {
        val uid = auth.currentUser?.uid ?: return false
        tenantId = store.tenantId()
        if (tenantId == null) {
            val memberships = firestore.collection("users/$uid/memberships").get().await()
            val active = memberships.documents.firstOrNull { it.getString("status") == "active" }
            tenantId = active?.getString("tenantId") ?: active?.id
            tenantId?.let { store.saveTenantId(it) }
        }
        return tenantId != null
    }

    suspend fun signIn(email: String, password: String) { auth.signInWithEmailAndPassword(email, password).await(); restoreTenant() }
    suspend fun register(email: String, password: String) { auth.createUserWithEmailAndPassword(email, password).await() }
    suspend fun signInWithGoogle(idToken: String) { auth.signInWithCredential(GoogleAuthProvider.getCredential(idToken, null)).await(); restoreTenant() }
    suspend fun createTenant(value: TenantCreate) { val created = api.createTenant(value); tenantId = created.tenant.id; store.saveTenantId(created.tenant.id) }

    suspend fun tenant(): TenantContextResponse {
        val uid = auth.currentUser?.uid ?: error("Sesión vencida")
        val id = tenantId ?: error("Selecciona una empresa")
        val tenant = firestore.document("tenants/$id").get().await()
        val membership = firestore.document("tenants/$id/members/$uid").get().await()
        check(tenant.exists() && membership.exists()) { "No se encontró el acceso a la empresa" }
        return TenantContextResponse(tenant.toTenant(), membership.toMembership(id))
    }

    suspend fun signOut() { stopRealtime(); auth.signOut(); tenantId = null; store.clear() }
    fun signedIn() = auth.currentUser != null

    fun observeRealtime(
        clients: (List<Client>, Boolean) -> Unit,
        loans: (List<Loan>, Boolean) -> Unit,
        articles: (List<Article>, Boolean) -> Unit,
        transactions: (List<CashTransaction>, Boolean) -> Unit,
        tenant: (TenantInfo) -> Unit,
        error: (Throwable) -> Unit
    ) {
        stopRealtime()
        val id = tenantId ?: return
        fun listen(name: String, consume: (List<DocumentSnapshot>, Boolean) -> Unit) {
            listeners += firestore.collection("tenants/$id/$name").addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, failure ->
                if (failure != null) error(failure) else if (snapshot != null) consume(snapshot.documents, snapshot.metadata.isFromCache)
            }
        }
        listen("clients") { docs, cache -> clients(docs.map { it.toClient() }, cache) }
        listen("loans") { docs, cache -> loans(docs.map { it.toLoan() }, cache) }
        listen("articles") { docs, cache -> articles(docs.map { it.toArticle() }, cache) }
        listen("transactions") { docs, cache -> transactions(docs.map { it.toTransaction() }, cache) }
        listeners += firestore.document("tenants/$id").addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, failure ->
            if (failure != null) error(failure) else if (snapshot?.exists() == true) tenant(snapshot.toTenant())
        }
    }

    fun stopRealtime() { listeners.forEach { it.remove() }; listeners.clear() }

    fun createClient(value: ClientCreate) {
        val id = requireTenant(); val ref = firestore.collection("tenants/$id/clients").document()
        ref.set(mapOf("tenantId" to id, "name" to value.name, "phone" to value.phone, "address" to value.address, "createdAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp()))
    }

    fun createLoan(value: LoanCreate) {
        val id = requireTenant(); val ref = firestore.collection("tenants/$id/loans").document()
        ref.set(mapOf(
            "tenantId" to id, "clientId" to value.clientId, "clientName" to value.clientName, "type" to value.type,
            "capital" to value.capital, "rate" to value.rate, "installments" to value.installments,
            "paymentFrequency" to value.paymentFrequency, "installmentAmount" to value.installmentAmount,
            "interestAmount" to value.interestAmount, "totalPayable" to value.totalPayable,
            "nextPaymentDate" to value.nextPaymentDate, "contractNumber" to (value.contractNumber ?: "PRE-${ref.id.take(8).uppercase()}"),
            "balance" to value.balance, "status" to value.status, "dueDate" to value.dueDate,
            "createdAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp()
        ))
    }

    fun createArticle(value: ArticleCreate) {
        val id = requireTenant(); val ref = firestore.collection("tenants/$id/articles").document()
        ref.set(mapOf("tenantId" to id, "name" to value.name, "category" to value.category, "brand" to value.brand,
            "state" to value.state, "description" to value.description, "contractId" to value.contractId, "clientId" to value.clientId,
            "createdAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp()))
    }

    suspend fun createTransaction(value: TransactionCreate) = api.createTransaction(value)
    private fun requireTenant() = tenantId ?: error("No hay una empresa activa")
}

private fun DocumentSnapshot.toTenant(): TenantInfo {
    val branding = get("branding") as? Map<*, *> ?: emptyMap<String, Any>()
    val printer = get("printer") as? Map<*, *> ?: emptyMap<String, Any>()
    val subscription = get("subscription") as? Map<*, *> ?: emptyMap<String, Any>()
    val status = subscription["status"]?.toString().orEmpty()
    val end = valueAsIso(subscription["accessUntil"] ?: subscription["currentPeriodEnd"]).orEmpty()
    val accessAllowed = status in setOf("active", "trialing") && runCatching { Instant.parse(end).isAfter(Instant.now()) }.getOrDefault(false)
    return TenantInfo(id, BrandingInfo(
        businessName = branding["businessName"]?.toString() ?: "PrestaPay", legalName = branding["legalName"]?.toString().orEmpty(),
        taxId = branding["taxId"]?.toString().orEmpty(), address = branding["address"]?.toString().orEmpty(), phone = branding["phone"]?.toString().orEmpty(),
        email = branding["email"]?.toString().orEmpty(), currency = branding["currency"]?.toString() ?: "DOP"
    ), PrinterInfo(
        paperWidth = (printer["paperWidth"] as? Number)?.toInt() ?: 80, marginMm = (printer["marginMm"] as? Number)?.toInt() ?: 3,
        copies = (printer["copies"] as? Number)?.toInt() ?: 1, footer = printer["footer"]?.toString() ?: "Gracias por su pago"
    ), SubscriptionInfo(status, end, accessAllowed))
}

private fun DocumentSnapshot.toMembership(tenantId: String): Membership {
    val raw = get("permissions") as? Map<*, *> ?: emptyMap<String, Any>()
    fun permission(name: String) = raw[name] as? Boolean ?: false
    return Membership(id, tenantId, getString("role") ?: "viewer", getString("status") ?: "disabled", Permissions(
        permission("viewHistory"), permission("manageLoans"), permission("manageClients"), permission("manageInventory"),
        permission("manageCash"), permission("manageStaff"), permission("manageSettings")
    ))
}

private fun DocumentSnapshot.toClient() = Client(id, getString("name").orEmpty(), getString("phone").orEmpty(), getString("address").orEmpty(), getString("identityNumber"), valueAsIso(get("createdAt")))
private fun DocumentSnapshot.toLoan() = Loan(
    id, getString("clientName"), getString("clientId").orEmpty(), getString("type").orEmpty(), number("capital"), number("rate"),
    (get("installments") as? Number)?.toInt() ?: 1, getString("paymentFrequency") ?: "mensual", nullableNumber("installmentAmount"),
    nullableNumber("interestAmount"), nullableNumber("totalPayable"), getString("nextPaymentDate"), getString("contractNumber"),
    number("balance"), getString("status") ?: "activo", getString("dueDate").orEmpty(), valueAsIso(get("createdAt"))
)
private fun DocumentSnapshot.toArticle() = Article(id, getString("name").orEmpty(), getString("category").orEmpty(), getString("brand").orEmpty(), getString("state") ?: "en_resguardo", getString("description").orEmpty())
private fun DocumentSnapshot.toTransaction() = CashTransaction(id, getString("type").orEmpty(), number("amount"), getString("description"))
private fun DocumentSnapshot.number(name: String) = (get(name) as? Number)?.toDouble() ?: 0.0
private fun DocumentSnapshot.nullableNumber(name: String) = (get(name) as? Number)?.toDouble()
private fun valueAsIso(value: Any?): String? = when (value) { is Timestamp -> value.toDate().toInstant().toString(); is String -> value; else -> null }
