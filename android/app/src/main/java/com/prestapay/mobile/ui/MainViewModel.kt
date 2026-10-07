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
    val loading: Boolean = true, val signedIn: Boolean = false, val error: String? = null,
    val summary: Summary? = null, val clients: List<Client> = emptyList(), val loans: List<Loan> = emptyList(),
    val articles: List<Article> = emptyList(), val transactions: List<CashTransaction> = emptyList()
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = PrestaPayRepository(FirebaseAuth.getInstance(), SessionStore(application))
    var state by androidx.compose.runtime.mutableStateOf(AppState()); private set
    init { viewModelScope.launch { val ready = repository.signedIn() && repository.restoreTenant(); state = state.copy(loading = false, signedIn = ready); if (ready) refresh() } }
    fun login(email: String, password: String) = viewModelScope.launch { state = state.copy(loading = true, error = null); runCatching { repository.signIn(email.trim(), password); refresh(); state = state.copy(loading = false, signedIn = true) }.onFailure { state = state.copy(loading = false, error = it.message) } }
    fun logout() = viewModelScope.launch { repository.signOut(); state = AppState(loading = false) }
    fun refresh() = viewModelScope.launch {
        state = state.copy(loading = true, error = null)
        runCatching {
            val summary = async { repository.summary() }; val clients = async { repository.clients() }; val loans = async { repository.loans() }; val articles = async { repository.articles() }; val cash = async { repository.transactions() }
            state = state.copy(loading = false, summary = summary.await(), clients = clients.await(), loans = loans.await(), articles = articles.await(), transactions = cash.await())
        }.onFailure { state = state.copy(loading = false, error = it.message ?: "No se pudo cargar") }
    }
}
