package com.prestapay.mobile.ui

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.prestapay.mobile.data.*
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.Instant

enum class ThemeMode(val value: String) { SYSTEM("system"), LIGHT("light"), DARK("dark");
    companion object { fun from(value: String) = entries.firstOrNull { it.value == value } ?: SYSTEM }
}

data class AppState(
    val loading: Boolean = true, val signedIn: Boolean = false, val needsTenant: Boolean = false, val error: String? = null,
    val tenant: TenantInfo? = null, val membership: Membership? = null,
    val summary: Summary? = null, val clients: List<Client> = emptyList(), val loans: List<Loan> = emptyList(),
    val articles: List<Article> = emptyList(), val transactions: List<CashTransaction> = emptyList(),
    val themeMode: ThemeMode = ThemeMode.SYSTEM, val usingOfflineCache: Boolean = false
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val sessionStore = SessionStore(application)
    private val repository = PrestaPayRepository(FirebaseAuth.getInstance(), sessionStore)
    var state by androidx.compose.runtime.mutableStateOf(AppState()); private set

    init {
        viewModelScope.launch { sessionStore.themeMode().collectLatest { state = state.copy(themeMode = ThemeMode.from(it)) } }
        viewModelScope.launch {
            val authenticated = repository.signedIn()
            val ready = authenticated && runCatching { repository.restoreTenant() }.getOrDefault(false)
            state = state.copy(loading = false, signedIn = authenticated, needsTenant = authenticated && !ready)
            if (ready) refresh()
        }
    }

    fun cycleTheme() = viewModelScope.launch {
        val next = when (state.themeMode) { ThemeMode.SYSTEM -> ThemeMode.LIGHT; ThemeMode.LIGHT -> ThemeMode.DARK; ThemeMode.DARK -> ThemeMode.SYSTEM }
        sessionStore.saveThemeMode(next.value)
    }

    fun login(email: String, password: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.signIn(email.trim(), password); val ready = repository.restoreTenant(); state = state.copy(loading = false, signedIn = true, needsTenant = !ready); if (ready) refresh() }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun register(email: String, password: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.register(email.trim(), password); state = state.copy(loading = false, signedIn = true, needsTenant = true) }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun loginWithGoogle(idToken: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.signInWithGoogle(idToken); val ready = repository.restoreTenant(); state = state.copy(loading = false, signedIn = true, needsTenant = !ready); if (ready) refresh() }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun createTenant(name: String, taxId: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.createTenant(TenantCreate(name, taxId = taxId)); state = state.copy(loading = false, needsTenant = false); refresh() }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun logout() = viewModelScope.launch { repository.signOut(); state = AppState(loading = false, themeMode = state.themeMode) }

    fun refresh() = viewModelScope.launch {
        state = state.copy(loading = true, error = null)
        runCatching {
            val current = repository.tenant()
            state = state.copy(loading = false, tenant = current.tenant, membership = current.membership)
            repository.observeRealtime(
                clients = { values, cached -> updateData(clients = values, cached = cached) },
                loans = { values, cached -> updateData(loans = values, cached = cached) },
                articles = { values, cached -> updateData(articles = values, cached = cached) },
                transactions = { values, cached -> updateData(transactions = values, cached = cached) },
                tenant = { value -> state = state.copy(tenant = value) },
                error = { failure -> state = state.copy(error = failure.message ?: "No se pudo sincronizar") }
            )
        }.onFailure { state = state.copy(loading = false, error = it.message ?: "No se pudo cargar. Se conservarán los datos sin conexión disponibles.") }
    }

    private fun updateData(clients: List<Client>? = null, loans: List<Loan>? = null, articles: List<Article>? = null, transactions: List<CashTransaction>? = null, cached: Boolean) {
        val next = state.copy(
            clients = clients ?: state.clients, loans = loans ?: state.loans, articles = articles ?: state.articles,
            transactions = transactions ?: state.transactions, usingOfflineCache = cached, loading = false
        )
        state = next.copy(summary = summary(next.clients, next.loans, next.articles))
    }

    private fun summary(clients: List<Client>, loans: List<Loan>, articles: List<Article>): Summary {
        val now = Instant.now(); val active = loans.filter { it.status != "pagado" }
        fun due(loan: Loan) = runCatching { Instant.parse(loan.nextPaymentDate ?: loan.dueDate) }.getOrNull()
        val overdue = active.count { due(it)?.isBefore(now) == true }
        return Summary(clients.size, active.map { it.clientId }.distinct().size, active.size, active.size - overdue, overdue,
            active.sumOf { it.capital }, articles.count { it.state == "en_resguardo" }, active.sumOf { it.balance })
    }

    fun createClient(value: ClientCreate) = mutate { repository.createClient(value) }
    fun createLoan(value: LoanCreate) = mutate { repository.createLoan(value) }
    fun createArticle(value: ArticleCreate) = mutate { repository.createArticle(value) }
    fun createTransaction(value: TransactionCreate) = mutate { repository.createTransaction(value) }
    private fun mutate(block: suspend () -> Unit) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { block(); state = state.copy(loading = false) }.onFailure { state = state.copy(loading = false, error = it.message) } }
    override fun onCleared() { repository.stopRealtime(); super.onCleared() }
}
