package com.prestapay.mobile.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.google.firebase.auth.FirebaseAuth
import com.prestapay.mobile.data.*
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

data class AppState(
    val loading: Boolean = true, val signedIn: Boolean = false, val needsTenant: Boolean = false, val error: String? = null,
    val tenant: TenantInfo? = null, val membership: Membership? = null,
    val summary: Summary? = null, val clients: List<Client> = emptyList(), val loans: List<Loan> = emptyList(),
    val articles: List<Article> = emptyList(), val transactions: List<CashTransaction> = emptyList()
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = PrestaPayRepository(FirebaseAuth.getInstance(), SessionStore(application))
    var state by androidx.compose.runtime.mutableStateOf(AppState()); private set
    init { viewModelScope.launch { val authenticated = repository.signedIn(); val ready = authenticated && repository.restoreTenant(); state = state.copy(loading = false, signedIn = authenticated, needsTenant = authenticated && !ready); if (ready) refresh() } }
    fun login(email: String, password: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.signIn(email.trim(), password); val ready = repository.restoreTenant(); state = state.copy(loading = false, signedIn = true, needsTenant = !ready); if (ready) refresh() }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun register(email: String, password: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.register(email.trim(), password); state = state.copy(loading = false, signedIn = true, needsTenant = true) }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun createTenant(name: String, taxId: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.createTenant(TenantCreate(name, taxId = taxId)); state = state.copy(loading = false, needsTenant = false); refresh() }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun logout() = viewModelScope.launch { repository.signOut(); state = AppState(loading = false) }
    fun refresh() = viewModelScope.launch {
        state = state.copy(loading = true, error = null)
        runCatching {
            val context = async { repository.tenant() }; val summary = async { repository.summary() }; val clients = async { repository.clients() }; val loans = async { repository.loans() }; val articles = async { repository.articles() }; val cash = async { repository.transactions() }
            val current = context.await(); state = state.copy(loading = false, tenant = current.tenant, membership = current.membership, summary = summary.await(), clients = clients.await(), loans = loans.await(), articles = articles.await(), transactions = cash.await())
        }.onFailure { state = state.copy(loading = false, error = it.message ?: "No se pudo cargar") }
    }
    fun createClient(value: ClientCreate) = mutate { repository.createClient(value) }
    fun createLoan(value: LoanCreate) = mutate { repository.createLoan(value) }
    fun createArticle(value: ArticleCreate) = mutate { repository.createArticle(value) }
    fun createTransaction(value: TransactionCreate) = mutate { repository.createTransaction(value) }
    private fun mutate(block: suspend () -> Unit) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { block(); refresh() }.onFailure { state = state.copy(loading = false, error = it.message) } }
}
