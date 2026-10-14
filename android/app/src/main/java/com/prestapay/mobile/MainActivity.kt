package com.prestapay.mobile

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.prestapay.mobile.data.*
import com.prestapay.mobile.printing.PairedPrinter
import com.prestapay.mobile.printing.LoanContractPdf
import com.prestapay.mobile.printing.ThermalPrinter
import com.prestapay.mobile.printing.ThermalReceiptPdf
import com.prestapay.mobile.ui.MainViewModel
import com.prestapay.mobile.ui.ThemeMode
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.Instant
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private val viewModel by viewModels<MainViewModel>()
    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        setContent { PrestaPayTheme(viewModel.state.themeMode) { PrestaPayApp(viewModel) } }
    }
}

@Composable private fun PrestaPayTheme(mode: ThemeMode, content: @Composable () -> Unit) {
    val dark = when (mode) { ThemeMode.DARK -> true; ThemeMode.LIGHT -> false; ThemeMode.SYSTEM -> isSystemInDarkTheme() }
    val colors = if (dark) darkColorScheme(
        primary = Color(0xFF5EEAD4), secondary = Color(0xFFFBBF24), background = Color(0xFF071F20),
        surface = Color(0xFF0C292A), surfaceContainer = Color(0xFF123536)
    ) else lightColorScheme(
        primary = Color(0xFF0F766E), secondary = Color(0xFFF59E0B), surface = Color(0xFFFAFAF8),
        surfaceContainer = Color.White, background = Color(0xFFF4F7F6)
    )
    MaterialTheme(colorScheme = colors, content = content)
}

@Composable private fun PrestaPayApp(vm: MainViewModel) {
    val state = vm.state
    when {
        state.loading && !state.signedIn -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        !state.signedIn -> LoginScreen(state.error, vm::login, vm::register, vm::loginWithGoogle)
        state.needsTenant -> TenantOnboarding(state.error, vm::createTenant)
        else -> MainShell(vm)
    }
}

@Composable private fun LoginScreen(error: String?, login: (String, String) -> Unit, register: (String, String) -> Unit, googleLogin: (String) -> Unit) {
    var email by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }; var creating by remember { mutableStateOf(false) }; var googleError by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current; val scope = rememberCoroutineScope(); val credentialManager = remember { CredentialManager.create(context) }
    fun signInGoogle() { scope.launch { googleError = null; runCatching { val option = GetGoogleIdOption.Builder().setFilterByAuthorizedAccounts(false).setServerClientId(BuildConfig.FIREBASE_WEB_CLIENT_ID).setAutoSelectEnabled(false).build(); val request = GetCredentialRequest.Builder().addCredentialOption(option).build(); val credential = credentialManager.getCredential(context, request).credential; require(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) { "Respuesta de Google no válida" }; GoogleIdTokenCredential.createFrom(credential.data).idToken }.onSuccess(googleLogin).onFailure { googleError = it.message ?: "No se pudo acceder con Google" } } }
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF083344), Color(0xFF0F766E)))).padding(22.dp), contentAlignment = Alignment.Center) {
        ElevatedCard(Modifier.fillMaxWidth().widthIn(max = 520.dp)) { Column(Modifier.padding(28.dp)) {
            Surface(shape = MaterialTheme.shapes.extraLarge, color = Color(0xFFFFF7D6), modifier = Modifier.size(64.dp)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Paid, null, Modifier.size(38.dp), tint = Color(0xFF0F766E)) } }
            Spacer(Modifier.height(18.dp)); Text("PrestaPay", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black); Text("Tu operación financiera, clara y bajo control.", color = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.height(26.dp))
            OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("Correo") }, leadingIcon = { Icon(Icons.Default.Email, null) }, singleLine = true); Spacer(Modifier.height(10.dp))
            OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("Contraseña") }, leadingIcon = { Icon(Icons.Default.Lock, null) }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
            (error ?: googleError)?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 10.dp)) }; Spacer(Modifier.height(18.dp))
            Button({ if (creating) register(email, password) else login(email, password) }, Modifier.fillMaxWidth().height(50.dp), enabled = email.isNotBlank() && password.length >= 6) { Text(if (creating) "Crear cuenta" else "Iniciar sesión", fontWeight = FontWeight.Bold) }
            Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) { HorizontalDivider(Modifier.weight(1f)); Text("  o  ", color = MaterialTheme.colorScheme.onSurfaceVariant); HorizontalDivider(Modifier.weight(1f)) }
            OutlinedButton(::signInGoogle, Modifier.fillMaxWidth().height(50.dp)) { Text("G", fontWeight = FontWeight.Black); Spacer(Modifier.width(10.dp)); Text("Continuar con Google", fontWeight = FontWeight.Bold) }
            TextButton({ creating = !creating }, Modifier.align(Alignment.CenterHorizontally)) { Text(if (creating) "Ya tengo una cuenta" else "Crear una cuenta") }
        } }
    }
}

@Composable private fun TenantOnboarding(error: String?, create: (String, String) -> Unit) {
    var name by remember { mutableStateOf("") }; var taxId by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("Crea tu empresa", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black); Text("Comienza con 14 días de prueba."); Spacer(Modifier.height(24.dp))
        OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("Nombre comercial") }); Spacer(Modifier.height(10.dp)); OutlinedTextField(taxId, { taxId = it }, Modifier.fillMaxWidth(), label = { Text("RNC / identificación fiscal") })
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 10.dp)) }; Spacer(Modifier.height(18.dp)); Button({ create(name, taxId) }, Modifier.fillMaxWidth(), enabled = name.length >= 2) { Text("Crear empresa") }
    }
}

private data class Destination(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun MainShell(vm: MainViewModel) {
    val destinations = listOf(Destination("Inicio", Icons.Default.Home), Destination("Clientes", Icons.Default.People), Destination("Préstamos", Icons.Default.AccountBalance), Destination("Inventario", Icons.Default.Inventory2), Destination("Caja", Icons.Default.Receipt), Destination("Cobros", Icons.Default.Notifications), Destination("Reportes", Icons.Default.Assessment), Destination("Imprimir", Icons.Default.Print))
    var selected by remember { mutableIntStateOf(0) }; val state = vm.state; val active = state.tenant?.subscription?.accessAllowed == true; val permissions = state.membership?.permissions ?: Permissions()
    Scaffold(topBar = { TopAppBar(title = { Column { Text(state.tenant?.branding?.businessName ?: "PrestaPay"); if (state.usingOfflineCache) Text("Modo sin conexión", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary) } }, actions = { if (state.usingOfflineCache) Icon(Icons.Default.CloudOff, "Datos guardados sin conexión", tint = MaterialTheme.colorScheme.secondary); IconButton(vm::cycleTheme) { Icon(when (state.themeMode) { ThemeMode.DARK -> Icons.Default.DarkMode; ThemeMode.LIGHT -> Icons.Default.LightMode; ThemeMode.SYSTEM -> Icons.Default.BrightnessAuto }, "Cambiar tema") }; IconButton(vm::refresh) { Icon(Icons.Default.Refresh, "Actualizar") }; IconButton(vm::logout) { Icon(Icons.AutoMirrored.Filled.Logout, "Salir") } }) },
        bottomBar = { NavigationBar { destinations.forEachIndexed { index, d -> NavigationBarItem(selected = selected == index, onClick = { selected = index }, icon = { Icon(d.icon, null) }, label = { Text(d.label, maxLines = 1) }) } } }) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when (selected) {
                0 -> Dashboard(vm)
                1 -> ClientScreen(state.clients, active && permissions.manageClients, vm::createClient)
                2 -> LoanScreen(state.loans, state.clients, state.tenant, active && permissions.manageLoans, vm::createLoan)
                3 -> ArticleScreen(state.articles, state.clients, state.loans, active && permissions.manageInventory, vm::createArticle)
                4 -> CashScreen(state.transactions, state.loans, state.tenant, active && permissions.manageCash, vm::createTransaction)
                5 -> NotificationsScreen(state.loans, state.clients)
                6 -> ReportsScreen(state.loans, state.clients)
                else -> PrintScreen(state.tenant)
            }
            if (!active && state.tenant != null) Surface(Modifier.fillMaxWidth().align(Alignment.TopCenter), color = MaterialTheme.colorScheme.errorContainer) { Text("Suscripción ${state.tenant.subscription.status}: operaciones bloqueadas", Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer) }
            if (state.loading) LinearProgressIndicator(Modifier.fillMaxWidth().align(Alignment.TopCenter))
        }
    }
}

@Composable private fun Dashboard(vm: MainViewModel) { val s = vm.state.summary; val context = LocalContext.current; LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Text("Resumen", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black) }; vm.state.error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }; s?.let { item { Metric("Capital invertido", "DOP ${it.capitalInvested}") }; item { Metric("Préstamos al día", it.onTimeLoans.toString()) }; item { Metric("Préstamos atrasados", it.overdueLoans.toString()) }; item { Metric("Clientes activos", it.activeClients.toString()) } }; item { TextButton({ context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.instagram.com/inmartagosrl/"))) }, Modifier.fillMaxWidth()) { Text("Sistema desarrollado por @inmartagosrl") } } } }
@Composable private fun Metric(label: String, value: String) { ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(20.dp)) { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) } } }

private fun dominicanDate(value: String?): LocalDate? = runCatching { Instant.parse(value).atZone(ZoneId.of("America/Santo_Domingo")).toLocalDate() }.getOrNull()

@Composable private fun NotificationsScreen(loans: List<Loan>, clients: List<Client>) {
    val today = LocalDate.now(ZoneId.of("America/Santo_Domingo")); val open = loans.filter { it.status != "pagado" }
    val dueToday = open.filter { dominicanDate(it.nextPaymentDate ?: it.dueDate) == today }; val overdue = open.filter { dominicanDate(it.nextPaymentDate ?: it.dueDate)?.isBefore(today) == true }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Text("Centro de cobros", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); Text("${dueToday.size} para cobrar hoy · ${overdue.size} atrasados") }
        item { Text("Cobrar hoy", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        if (dueToday.isEmpty()) item { Text("No hay cobros programados para hoy.") }
        items(dueToday) { loan -> CollectionCard(loan, clients, false) }
        item { Text("Atrasados", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp)) }
        if (overdue.isEmpty()) item { Text("No hay cobros atrasados.") }
        items(overdue) { loan -> CollectionCard(loan, clients, true) }
    }
}

@Composable private fun CollectionCard(loan: Loan, clients: List<Client>, late: Boolean) { val client = clients.find { it.id == loan.clientId }; ElevatedCard(Modifier.fillMaxWidth(), colors = CardDefaults.elevatedCardColors(containerColor = if (late) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer)) { Column(Modifier.padding(16.dp)) { Text(loan.clientName ?: client?.name ?: loan.clientId, fontWeight = FontWeight.Bold); Text(client?.phone.orEmpty()); Text(if (late) "ATRASADO" else "COBRAR HOY", color = if (late) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSecondaryContainer, fontWeight = FontWeight.Black); Text("Cuota DOP ${loan.installmentAmount ?: 0.0}") } } }

@Composable private fun ReportsScreen(loans: List<Loan>, clients: List<Client>) {
    val today = LocalDate.now(ZoneId.of("America/Santo_Domingo")); var from by remember { mutableStateOf(today.withDayOfMonth(1).toString()) }; var to by remember { mutableStateOf(today.toString()) }
    fun inRange(value: String?): Boolean { val date = dominicanDate(value) ?: return false; val start = runCatching { LocalDate.parse(from) }.getOrNull() ?: return false; val end = runCatching { LocalDate.parse(to) }.getOrNull() ?: return false; return !date.isBefore(start) && !date.isAfter(end) }
    val rangeLoans = loans.filter { inRange(it.createdAt) }; val rangeClients = clients.filter { inRange(it.createdAt) }; val capital = rangeLoans.sumOf { it.capital }; val profit = rangeLoans.sumOf { it.interestAmount ?: (it.capital * it.rate / 100.0) }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { item { Text("Reportes", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black) }; item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedTextField(from, { from = it }, Modifier.weight(1f), label = { Text("Desde") }); OutlinedTextField(to, { to = it }, Modifier.weight(1f), label = { Text("Hasta") }) } }; item { Metric("Clientes creados", rangeClients.size.toString()) }; item { Metric("Préstamos creados", rangeLoans.size.toString()) }; item { Metric("Capital colocado", "DOP $capital") }; item { Metric("Beneficio proyectado", "DOP $profit") }; items(rangeLoans) { loan -> ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Text(loan.clientName ?: loan.clientId, fontWeight = FontWeight.Bold); Text("Capital DOP ${loan.capital} · Beneficio DOP ${loan.interestAmount ?: (loan.capital * loan.rate / 100.0)}") } } }; item { Text("El beneficio es una proyección y no sustituye un estado contable o fiscal.", style = MaterialTheme.typography.bodySmall) } }
}

@Composable private fun ScreenHeader(title: String, canAdd: Boolean, onAdd: () -> Unit) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); FilledIconButton(onAdd, enabled = canAdd) { Icon(Icons.Default.Add, "Agregar") } } }

@Composable private fun ClientScreen(values: List<Client>, canWrite: Boolean, create: (ClientCreate) -> Unit) {
    var dialog by remember { mutableStateOf(false) }; LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { item { ScreenHeader("Clientes", canWrite) { dialog = true } }; if (values.isEmpty()) item { Text("No hay clientes registrados.") }; items(values) { ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(it.name, fontWeight = FontWeight.Bold); Text(it.phone); Text(it.address, color = MaterialTheme.colorScheme.onSurfaceVariant) } } } }; if (dialog) ClientDialog({ dialog = false }) { create(it); dialog = false }
}

@Composable private fun ClientDialog(close: () -> Unit, submit: (ClientCreate) -> Unit) { var name by remember { mutableStateOf("") }; var phone by remember { mutableStateOf("") }; var address by remember { mutableStateOf("") }; FormDialog("Nuevo cliente", close, name.length >= 2, { submit(ClientCreate(name, phone, address)) }) { OutlinedTextField(name, { name = it }, label = { Text("Nombre") }); OutlinedTextField(phone, { phone = it }, label = { Text("Teléfono") }); OutlinedTextField(address, { address = it }, label = { Text("Dirección") }) } }

@Composable private fun LoanScreen(values: List<Loan>, clients: List<Client>, tenant: TenantInfo?, canWrite: Boolean, create: (LoanCreate) -> Unit) {
    val context = LocalContext.current; var dialog by remember { mutableStateOf(false) }; LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { item { ScreenHeader("Préstamos", canWrite) { dialog = true } }; if (values.isEmpty()) item { Text("No hay préstamos registrados.") }; items(values) { loan -> ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(loan.clientName ?: loan.clientId, fontWeight = FontWeight.Bold); Text("${loan.type} · ${loan.status}"); Text("${loan.installments} cuotas · Frecuencia ${loan.paymentFrequency}", color = MaterialTheme.colorScheme.primary); Text("Balance DOP ${loan.balance}"); val client = clients.find { it.id == loan.clientId }; if (tenant != null && client != null) TextButton({ LoanContractPdf.share(context, tenant, client, loan) }) { Icon(Icons.Default.PictureAsPdf, null); Spacer(Modifier.width(6.dp)); Text("Contrato PDF") } } } } }; if (dialog) LoanDialog(clients, { dialog = false }) { create(it); dialog = false }
}

@Composable private fun LoanDialog(clients: List<Client>, close: () -> Unit, submit: (LoanCreate) -> Unit) {
    var selected by remember { mutableStateOf<Client?>(clients.firstOrNull()) }; var expanded by remember { mutableStateOf(false) }; var frequencyExpanded by remember { mutableStateOf(false) }; var capital by remember { mutableStateOf("") }; var rate by remember { mutableStateOf("10") }; var installments by remember { mutableStateOf("1") }; var paymentFrequency by remember { mutableStateOf("mensual") }; var type by remember { mutableStateOf("prenda") }; var dueDate by remember { mutableStateOf(LocalDate.now().plusMonths(1).toString()) }
    val installmentCount = installments.toIntOrNull(); val valid = selected != null && capital.toDoubleOrNull()?.let { it > 0 } == true && installmentCount != null && installmentCount in 1..600
    FormDialog("Nuevo préstamo", close, valid, { val amount = capital.toDouble(); val loanRate = rate.toDoubleOrNull() ?: 0.0; val interest = amount * loanRate / 100.0; val total = amount + interest; val installmentAmount = total / installmentCount!!; val firstPayment = when (paymentFrequency) { "diaria" -> LocalDate.now().plusDays(1); "semanal" -> LocalDate.now().plusWeeks(1); "quincenal" -> LocalDate.now().plusDays(15); else -> LocalDate.now().plusMonths(1) }; submit(LoanCreate(clientId = selected!!.id, clientName = selected!!.name, type = type, capital = amount, rate = loanRate, installments = installmentCount, paymentFrequency = paymentFrequency, installmentAmount = installmentAmount, interestAmount = interest, totalPayable = total, nextPaymentDate = "${firstPayment}T23:59:59Z", balance = total, dueDate = "${dueDate}T23:59:59Z")) }) {
        Box { OutlinedButton({ expanded = true }, Modifier.fillMaxWidth()) { Text(selected?.name ?: "Selecciona un cliente") }; DropdownMenu(expanded, { expanded = false }) { clients.forEach { DropdownMenuItem({ Text(it.name) }, { selected = it; expanded = false }) } } }
        OutlinedTextField(capital, { capital = it }, label = { Text("Capital") }); OutlinedTextField(rate, { rate = it }, label = { Text("Tasa %") }); Box { OutlinedButton({ frequencyExpanded = true }, Modifier.fillMaxWidth()) { Text("Frecuencia: ${paymentFrequency.replaceFirstChar { it.uppercase() }}") }; DropdownMenu(frequencyExpanded, { frequencyExpanded = false }) { listOf("diaria", "semanal", "quincenal", "mensual").forEach { frequency -> DropdownMenuItem({ Text(frequency.replaceFirstChar { it.uppercase() }) }, { paymentFrequency = frequency; frequencyExpanded = false }) } } }; OutlinedTextField(installments, { installments = it }, label = { Text("Cantidad de cuotas") }); OutlinedTextField(type, { type = it }, label = { Text("Tipo: prenda, sin_garantia, hipotecario") }); OutlinedTextField(dueDate, { dueDate = it }, label = { Text("Vencimiento AAAA-MM-DD") })
    }
}

@Composable private fun ArticleScreen(values: List<Article>, clients: List<Client>, loans: List<Loan>, canWrite: Boolean, create: (ArticleCreate) -> Unit) {
    var dialog by remember { mutableStateOf(false) }; LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { item { ScreenHeader("Inventario", canWrite) { dialog = true } }; if (values.isEmpty()) item { Text("No hay artículos registrados.") }; items(values) { ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(it.name, fontWeight = FontWeight.Bold); Text("${it.brand} · ${it.category}"); Text(it.state) } } } }; if (dialog) ArticleDialog(clients, loans, { dialog = false }) { create(it); dialog = false }
}

@Composable private fun ArticleDialog(clients: List<Client>, loans: List<Loan>, close: () -> Unit, submit: (ArticleCreate) -> Unit) { var name by remember { mutableStateOf("") }; var category by remember { mutableStateOf("") }; var brand by remember { mutableStateOf("") }; var description by remember { mutableStateOf("") }; var loanId by remember { mutableStateOf("") }; FormDialog("Nuevo artículo", close, name.length >= 2 && category.isNotBlank(), { val loan = loans.find { it.id == loanId }; submit(ArticleCreate(name, category, brand, description = description, contractId = loan?.id, clientId = loan?.clientId)) }) { OutlinedTextField(name, { name = it }, label = { Text("Artículo") }); OutlinedTextField(category, { category = it }, label = { Text("Categoría") }); OutlinedTextField(brand, { brand = it }, label = { Text("Marca") }); OutlinedTextField(loanId, { loanId = it }, label = { Text("ID préstamo opcional") }); OutlinedTextField(description, { description = it }, label = { Text("Descripción") }) } }

@Composable private fun CashScreen(values: List<CashTransaction>, loans: List<Loan>, tenant: TenantInfo?, canWrite: Boolean, create: (TransactionCreate, (CreateResult) -> Unit) -> Unit) {
    val context = LocalContext.current
    var search by remember { mutableStateOf("") }
    var selectedLoan by remember { mutableStateOf<Loan?>(null) }
    var generalDialog by remember { mutableStateOf(false) }
    val balance = values.sumOf { if (it.type == "ingreso") it.amount else -it.amount }
    val activeLoans = loans.filter { it.status != "pagado" && it.balance > 0 }
    val filteredLoans = activeLoans.filter { search.isBlank() || "${it.clientName.orEmpty()} ${it.contractNumber.orEmpty()} ${it.id}".contains(search.trim(), ignoreCase = true) }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Caja", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); Text("Balance DOP $balance") }
                FilledIconButton({ generalDialog = true }, enabled = canWrite) { Icon(Icons.Default.Add, "Movimiento general") }
            }
        }
        item { OutlinedTextField(search, { search = it }, Modifier.fillMaxWidth(), label = { Text("Buscar cliente o contrato") }, leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true) }
        item { Text("Préstamos activos (${activeLoans.size})", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
        if (filteredLoans.isEmpty()) item { Text(if (search.isBlank()) "No hay préstamos activos." else "No se encontraron préstamos.") }
        items(filteredLoans, key = { it.id }) { loan ->
            ElevatedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { Text(loan.clientName ?: "Cliente", fontWeight = FontWeight.Bold); Text(loan.contractNumber ?: loan.id.take(8), style = MaterialTheme.typography.bodySmall) }
                        Button({ selectedLoan = loan }, enabled = canWrite) { Text("Pagar") }
                    }
                    Text("Saldo DOP ${loan.balance}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    Text("Cuota DOP ${loanInstallmentAmount(loan)} · ${loan.paymentFrequency.replaceFirstChar { it.uppercase() }}", style = MaterialTheme.typography.bodySmall)
                    dominicanDate(loan.nextPaymentDate ?: loan.dueDate)?.let { Text("Próximo cobro $it", style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
        item { Text("Movimientos recientes", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp)) }
        if (values.isEmpty()) item { Text("No hay movimientos.") }
        items(values, key = { it.id }) { movement -> ElevatedCard(Modifier.fillMaxWidth()) { Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) { Text(movement.description ?: movement.type); Text("${if (movement.type == "ingreso") "+" else "-"}DOP ${movement.amount}", fontWeight = FontWeight.Bold) } } }
    }
    selectedLoan?.let { loan ->
        LoanPaymentDialog(loan, { selectedLoan = null }) { payment ->
            create(payment) { result -> tenant?.let { ThermalReceiptPdf.share(context, it, loan, payment, result) }; selectedLoan = null }
        }
    }
    if (generalDialog) GeneralTransactionDialog({ generalDialog = false }) { movement ->
        create(movement) { result -> if (movement.type == "ingreso") tenant?.let { ThermalReceiptPdf.share(context, it, null, movement, result) }; generalDialog = false }
    }
}

private fun loanInstallmentAmount(loan: Loan): Double = loan.installmentAmount ?: ((loan.capital + loan.capital * loan.rate / 100.0) / loan.installments.coerceAtLeast(1))

@Composable private fun LoanPaymentDialog(loan: Loan, close: () -> Unit, submit: (TransactionCreate) -> Unit) {
    var mode by remember { mutableStateOf("installment") }
    var countText by remember { mutableStateOf("2") }
    var customText by remember { mutableStateOf("") }
    val installment = loanInstallmentAmount(loan)
    val count = countText.toIntOrNull()?.coerceAtLeast(1) ?: 1
    val amount = when (mode) { "custom" -> customText.toDoubleOrNull() ?: 0.0; "multiple" -> minOf(loan.balance, installment * count); else -> minOf(loan.balance, installment) }
    val valid = amount > 0 && amount <= loan.balance && (mode != "multiple" || count >= 2)
    AlertDialog(
        onDismissRequest = close,
        title = { Text("Pago · ${loan.clientName ?: "Cliente"}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Saldo DOP ${loan.balance}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text("Cuota DOP $installment")
                listOf("installment" to "Una cuota", "multiple" to "Varias cuotas", "custom" to "Otro monto").forEach { (value, label) ->
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { RadioButton(mode == value, { mode = value }); Text(label) }
                }
                if (mode == "multiple") OutlinedTextField(countText, { countText = it }, Modifier.fillMaxWidth(), label = { Text("Cantidad de cuotas") }, singleLine = true)
                if (mode == "custom") OutlinedTextField(customText, { customText = it }, Modifier.fillMaxWidth(), label = { Text("Monto a pagar") }, singleLine = true)
                Text("Total DOP $amount", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (amount > loan.balance) Text("El pago no puede superar el saldo.", color = MaterialTheme.colorScheme.error)
            }
        },
        confirmButton = {
            Button({
                val paidCount = when (mode) { "installment" -> 1; "multiple" -> count; else -> null }
                val description = if (mode == "custom") "Abono libre al préstamo" else "Pago de $paidCount ${if (paidCount == 1) "cuota" else "cuotas"}"
                submit(TransactionCreate(loan.id, "ingreso", amount, description, mode, paidCount))
            }, enabled = valid) { Text("Registrar y crear recibo") }
        },
        dismissButton = { TextButton(close) { Text("Cancelar") } }
    )
}

@Composable private fun GeneralTransactionDialog(close: () -> Unit, submit: (TransactionCreate) -> Unit) {
    var amount by remember { mutableStateOf("") }; var description by remember { mutableStateOf("") }; var type by remember { mutableStateOf("ingreso") }
    FormDialog("Movimiento general", close, amount.toDoubleOrNull()?.let { it > 0 } == true && description.isNotBlank(), { submit(TransactionCreate(type = type, amount = amount.toDouble(), description = description)) }) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { RadioButton(type == "ingreso", { type = "ingreso" }); Text("Ingreso"); Spacer(Modifier.width(12.dp)); RadioButton(type == "egreso", { type = "egreso" }); Text("Egreso") }
        OutlinedTextField(amount, { amount = it }, Modifier.fillMaxWidth(), label = { Text("Monto") })
        OutlinedTextField(description, { description = it }, Modifier.fillMaxWidth(), label = { Text("Descripción") })
    }
}

@Composable private fun FormDialog(title: String, close: () -> Unit, valid: Boolean, submit: () -> Unit, fields: @Composable ColumnScope.() -> Unit) { AlertDialog(onDismissRequest = close, title = { Text(title) }, text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp), content = fields) }, confirmButton = { Button(submit, enabled = valid) { Text("Guardar") } }, dismissButton = { TextButton(close) { Text("Cancelar") } }) }

@Composable private fun PrintScreen(tenant: TenantInfo?) {
    val context = androidx.compose.ui.platform.LocalContext.current; val printer = remember { ThermalPrinter(context) }; val scope = rememberCoroutineScope(); var devices by remember { mutableStateOf<List<PairedPrinter>>(emptyList()) }; var status by remember { mutableStateOf("") }; var width by remember(tenant?.printer?.paperWidth) { mutableIntStateOf(tenant?.printer?.paperWidth ?: 80) }; val brand = tenant?.branding ?: BrandingInfo(); val printerSettings = tenant?.printer ?: PrinterInfo()
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) devices = printer.paired() else status = "Permiso Bluetooth denegado" }
    fun load() { if (Build.VERSION.SDK_INT >= 31 && !printer.hasPermission()) permission.launch(Manifest.permission.BLUETOOTH_CONNECT) else devices = printer.paired() }
    LaunchedEffect(Unit) { load() }
    Column(Modifier.fillMaxSize().padding(16.dp)) { Text("Impresión térmica", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); Text("Selecciona 58 u 80 mm y una impresora Bluetooth vinculada."); Row(verticalAlignment = Alignment.CenterVertically) { RadioButton(width == 58, { width = 58 }); Text("58 mm"); RadioButton(width == 80, { width = 80 }); Text("80 mm") }; devices.forEach { device -> Button(onClick = { scope.launch { status = "Imprimiendo…"; runCatching { withContext(Dispatchers.IO) { printer.print(device.address, ReceiptModel(brand.businessName, brand.taxId, brand.address, brand.phone, "MUESTRA-001", "Cliente de ejemplo", "Abono de préstamo", 1500.0, currency = brand.currency, footer = printerSettings.footer, paperWidth = width)) } }.onSuccess { status = "Impresión enviada" }.onFailure { status = it.message ?: "Error de impresión" } } }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) { Text("${device.name} · ${device.address}") } }; if (devices.isEmpty()) Text("No hay impresoras vinculadas. Vincúlala primero en Ajustes de Android."); Text(status, modifier = Modifier.padding(top = 12.dp)) }
}
