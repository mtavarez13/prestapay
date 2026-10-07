package com.prestapay.mobile

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.prestapay.mobile.data.ReceiptModel
import com.prestapay.mobile.printing.PairedPrinter
import com.prestapay.mobile.printing.ThermalPrinter
import com.prestapay.mobile.ui.MainViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private val viewModel by viewModels<MainViewModel>()
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { PrestaPayTheme { PrestaPayApp(viewModel) } } }
}

@Composable private fun PrestaPayTheme(content: @Composable () -> Unit) { MaterialTheme(colorScheme = lightColorScheme(primary = androidx.compose.ui.graphics.Color(0xFF4F46E5), secondary = androidx.compose.ui.graphics.Color(0xFF10B981)), content = content) }

@Composable private fun PrestaPayApp(vm: MainViewModel) {
    val state = vm.state
    when { state.loading && !state.signedIn -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        !state.signedIn -> LoginScreen(state.error, vm::login)
        else -> MainShell(vm) }
}

@Composable private fun LoginScreen(error: String?, login: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("PrestaPay", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black); Text("Aplicación nativa segura", color = MaterialTheme.colorScheme.onSurfaceVariant); Spacer(Modifier.height(32.dp))
        OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("Correo") }, singleLine = true); Spacer(Modifier.height(12.dp))
        OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("Contraseña") }, visualTransformation = PasswordVisualTransformation(), singleLine = true)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp)) }; Spacer(Modifier.height(20.dp))
        Button({ login(email, password) }, Modifier.fillMaxWidth(), enabled = email.isNotBlank() && password.isNotBlank()) { Text("Iniciar sesión") }
    }
}

private data class Destination(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun MainShell(vm: MainViewModel) {
    val destinations = listOf(Destination("Inicio", Icons.Default.Home), Destination("Clientes", Icons.Default.People), Destination("Préstamos", Icons.Default.AccountBalance), Destination("Inventario", Icons.Default.Inventory2), Destination("Caja", Icons.Default.Receipt), Destination("Imprimir", Icons.Default.Print))
    var selected by remember { mutableIntStateOf(0) }
    Scaffold(topBar = { TopAppBar(title = { Text("PrestaPay") }, actions = { IconButton(vm::refresh) { Icon(Icons.Default.Refresh, "Actualizar") }; IconButton(vm::logout) { Icon(Icons.Default.Logout, "Salir") } }) }, bottomBar = { NavigationBar { destinations.forEachIndexed { index, d -> NavigationBarItem(selected = selected == index, onClick = { selected = index }, icon = { Icon(d.icon, null) }, label = { Text(d.label, maxLines = 1) }) } } }) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) { when(selected) { 0 -> Dashboard(vm); 1 -> SimpleList("Clientes", vm.state.clients) { item: com.prestapay.mobile.data.Client -> item.name + "\n" + item.phone }; 2 -> SimpleList("Préstamos", vm.state.loans) { item: com.prestapay.mobile.data.Loan -> (item.clientName ?: item.clientId) + " · ${item.status}\nBalance DOP ${item.balance}" }; 3 -> SimpleList("Inventario", vm.state.articles) { item: com.prestapay.mobile.data.Article -> item.name + " · " + item.state }; 4 -> SimpleList("Caja", vm.state.transactions) { item: com.prestapay.mobile.data.CashTransaction -> "${item.type}: DOP ${item.amount}\n${item.description.orEmpty()}" }; else -> PrintScreen() } }
    }
}

@Composable private fun Dashboard(vm: MainViewModel) { val s = vm.state.summary; LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Text("Resumen", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black) }; if (vm.state.error != null) item { Text(vm.state.error!!, color = MaterialTheme.colorScheme.error) }; if (s != null) { item { Metric("Capital pendiente", "DOP ${s.outstandingBalance}") }; item { Metric("Préstamos activos", s.activeLoans.toString()) }; item { Metric("Clientes", s.clients.toString()) }; item { Metric("Artículos", s.heldArticles.toString()) } } } }
@Composable private fun Metric(label: String, value: String) { ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(20.dp)) { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) } } }
@Composable private fun <T> SimpleList(title: String, values: List<T>, text: (T) -> String) { LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { item { Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black) }; if (values.isEmpty()) item { Text("No hay registros.") }; items(values) { ElevatedCard(Modifier.fillMaxWidth()) { Text(text(it), Modifier.padding(16.dp)) } } } }

@Composable private fun PrintScreen() {
    val context = androidx.compose.ui.platform.LocalContext.current; val printer = remember { ThermalPrinter(context) }; val scope = rememberCoroutineScope(); var devices by remember { mutableStateOf<List<PairedPrinter>>(emptyList()) }; var status by remember { mutableStateOf("") }; var width by remember { mutableIntStateOf(80) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) devices = printer.paired() else status = "Permiso Bluetooth denegado" }
    fun load() { if (Build.VERSION.SDK_INT >= 31 && !printer.hasPermission()) permission.launch(Manifest.permission.BLUETOOTH_CONNECT) else devices = printer.paired() }
    LaunchedEffect(Unit) { load() }
    Column(Modifier.fillMaxSize().padding(16.dp)) { Text("Impresión térmica", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black); Text("Selecciona 58 u 80 mm y una impresora Bluetooth vinculada."); Row(verticalAlignment = Alignment.CenterVertically) { RadioButton(width == 58, { width = 58 }); Text("58 mm"); RadioButton(width == 80, { width = 80 }); Text("80 mm") }; devices.forEach { device -> Button(onClick = { scope.launch { status = "Imprimiendo…"; runCatching { withContext(Dispatchers.IO) { printer.print(device.address, ReceiptModel("PrestaPay", "", "Santo Domingo", "", "MUESTRA-001", "Cliente de ejemplo", "Abono de préstamo", 1500.0, paperWidth = width)) } }.onSuccess { status = "Impresión enviada" }.onFailure { status = it.message ?: "Error de impresión" } } }, modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) { Text("${device.name} · ${device.address}") } }; if (devices.isEmpty()) Text("No hay impresoras vinculadas. Vincúlala primero en Ajustes de Android."); Text(status, modifier = Modifier.padding(top = 12.dp)) }
}
