import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  HandCoins, 
  Calculator, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Receipt,
  MessageCircle,
  FileText
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { firestoreService } from './services/firestoreService';
import { UserProfile, UserRole } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';

// Pages (to be implemented in separate components if they get too large)
const Dashboard = () => (
  <div className="p-6">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500">Bienvenido al sistema PrendaPro</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard title="Capital Total" value="$125,000" icon={<Wallet className="text-emerald-600" />} trend="+5.2%" />
      <StatCard title="Préstamos Activos" value="42" icon={<HandCoins className="text-indigo-600" />} trend="+3" />
      <StatCard title="Clientes" value="128" icon={<Users className="text-blue-600" />} trend="+12" />
      <StatCard title="Artículos en Resguardo" value="56" icon={<Package className="text-amber-600" />} trend="+8" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Actividad Reciente
        </h2>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Nuevo Préstamo #102{i}</p>
                  <p className="text-sm text-gray-500">Juan Pérez • Hace 2 horas</p>
                </div>
              </div>
              <p className="font-semibold text-emerald-600">+$2,500</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Alertas de Vencimiento
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Artículo Vence Mañana</p>
                  <p className="text-sm text-gray-500">Laptop HP • Contrato #88{i}</p>
                </div>
              </div>
              <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">Ver Detalles</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const StatCard = ({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const Clients = () => (
  <div className="p-6">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500">Gestiona tu base de datos de clientes</p>
      </div>
      <button className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
        <Plus className="w-5 h-5" />
        Nuevo Cliente
      </button>
    </div>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-bottom border-gray-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
            <th className="px-6 py-4 font-semibold">Nombre</th>
            <th className="px-6 py-4 font-semibold">Teléfono</th>
            <th className="px-6 py-4 font-semibold">Dirección</th>
            <th className="px-6 py-4 font-semibold">Fecha Registro</th>
            <th className="px-6 py-4 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">Cliente Ejemplo {i}</td>
              <td className="px-6 py-4 text-gray-600">809-555-010{i}</td>
              <td className="px-6 py-4 text-gray-600">Calle Principal #12{i}, Santo Domingo</td>
              <td className="px-6 py-4 text-gray-600">12 Mar 2026</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">Editar</button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Loans = () => (
  <div className="p-6">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Préstamos</h1>
        <p className="text-gray-500">Control de contratos y empeños</p>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
          <Calculator className="w-5 h-5" />
          Simulador
        </button>
        <button className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          Nuevo Contrato
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
        <h3 className="text-indigo-900 font-semibold mb-1">Prenda</h3>
        <p className="text-indigo-700 text-sm mb-4">Garantía física de artículos</p>
        <div className="text-2xl font-bold text-indigo-900">28 Activos</div>
      </div>
      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
        <h3 className="text-emerald-900 font-semibold mb-1">Sin Garantía</h3>
        <p className="text-emerald-700 text-sm mb-4">Préstamos personales/firma</p>
        <div className="text-2xl font-bold text-emerald-900">12 Activos</div>
      </div>
      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
        <h3 className="text-amber-900 font-semibold mb-1">Hipotecario</h3>
        <p className="text-amber-700 text-sm mb-4">Garantía de inmuebles</p>
        <div className="text-2xl font-bold text-amber-900">2 Activos</div>
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
            <th className="px-6 py-4 font-semibold">Contrato</th>
            <th className="px-6 py-4 font-semibold">Cliente</th>
            <th className="px-6 py-4 font-semibold">Tipo</th>
            <th className="px-6 py-4 font-semibold">Capital</th>
            <th className="px-6 py-4 font-semibold">Balance</th>
            <th className="px-6 py-4 font-semibold">Estado</th>
            <th className="px-6 py-4 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">#CP-00{i}</td>
              <td className="px-6 py-4 text-gray-600">Juan Pérez</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase">Prenda</span>
              </td>
              <td className="px-6 py-4 text-gray-900 font-medium">$5,000</td>
              <td className="px-6 py-4 text-gray-900 font-medium">$3,200</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full uppercase">Activo</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <button className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">Ver</button>
                  <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">Cobrar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Inventory = () => (
  <div className="p-6">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-500">Control de artículos en resguardo y venta</p>
      </div>
      <button className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
        <Plus className="w-5 h-5" />
        Registrar Artículo
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
          <img 
            src={`https://picsum.photos/seed/item${i}/400/250`} 
            alt="Item" 
            className="w-full h-48 object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-900 text-lg">Laptop Dell Latitude</h3>
              <span className="px-2 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full uppercase">En Resguardo</span>
            </div>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
              Excelente estado, cargador original incluido. Procesador i5, 8GB RAM, 256GB SSD.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-sm">
                <span className="text-gray-400">Contrato:</span>
                <span className="ml-1 font-medium text-gray-900">#CP-00{i}</span>
              </div>
              <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1">
                Detalles <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Cashier = () => (
  <div className="p-6">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Caja</h1>
        <p className="text-gray-500">Registro de cobros y egresos</p>
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 bg-emerald-600 text-white py-2 px-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <Receipt className="w-5 h-5" />
          Cuadre de Caja
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Transacciones del Día</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Hora</th>
                <th className="px-6 py-4 font-semibold">Concepto</th>
                <th className="px-6 py-4 font-semibold">Monto</th>
                <th className="px-6 py-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3, 4].map(i => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500">10:45 AM</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">Pago Cuota #3</p>
                    <p className="text-xs text-gray-500">Contrato #CP-00{i} • Juan Pérez</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-emerald-600">+$850.00</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button title="Reimprimir Recibo" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Receipt className="w-4 h-4" />
                      </button>
                      <button title="Enviar WhatsApp" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Resumen de Caja</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Capital Inicial</span>
              <span className="font-semibold text-gray-900">$50,000.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Ingresos Hoy</span>
              <span className="font-semibold text-emerald-600">+$12,450.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Egresos Hoy</span>
              <span className="font-semibold text-red-600">-$2,500.00</span>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total en Caja</span>
              <span className="text-xl font-bold text-indigo-600">$59,950.00</span>
            </div>
          </div>
        </div>

        <button className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2">
          <Plus className="w-6 h-6" />
          Registrar Pago
        </button>
      </div>
    </div>
  </div>
);

const SettingsPage = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-8">Configuración</h1>
    
    <div className="max-w-2xl space-y-8">
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Perfil del Negocio
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
            <input type="text" defaultValue="PrendaPro Pawn Shop" className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capital Inicial</label>
            <input type="number" defaultValue="50000" className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datos del Notario</label>
            <textarea rows={3} className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue="Dr. Roberto Sánchez, Notario Público No. 1234"></textarea>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-indigo-600" />
          Usuarios y Roles
        </h2>
        <div className="space-y-4">
          {[
            { name: 'Admin User', role: 'Administrador', email: 'admin@prendapro.com' },
            { name: 'Cajero 1', role: 'Cajero', email: 'cajero1@prendapro.com' }
          ].map((user, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <span className="px-2 py-1 bg-white text-gray-600 text-xs font-bold rounded-lg border border-gray-200 uppercase">{user.role}</span>
            </div>
          ))}
          <button className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl hover:border-indigo-300 hover:text-indigo-500 transition-all font-medium">
            + Agregar Usuario
          </button>
        </div>
      </section>

      <button className="bg-indigo-600 text-white py-3 px-8 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
        Guardar Cambios
      </button>
    </div>
  </div>
);

// Main Layout Component
const MainLayout = ({ user, profile, onLogout }: { user: User, profile: UserProfile | null, onLogout: () => void }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clientes', icon: Users, label: 'Clientes' },
    { path: '/prestamos', icon: HandCoins, label: 'Préstamos' },
    { path: '/inventario', icon: Package, label: 'Inventario' },
    { path: '/caja', icon: Calculator, label: 'Caja' },
    { path: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-gray-200 flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">PrendaPro</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                location.pathname === item.path 
                  ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={location.pathname === item.path ? 'text-indigo-600' : 'text-gray-400'}>
                <item.icon size={22} />
              </span>
              {isSidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full rounded-full" /> : <UserIcon size={20} />}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{user.displayName || 'Usuario'}</p>
                <p className="text-xs text-gray-500 truncate uppercase">{profile?.role || 'Cargando...'}</p>
              </div>
            )}
          </div>
          <button 
            onClick={onLogout}
            className={`w-full flex items-center gap-4 p-3 mt-2 text-red-500 hover:bg-red-50 rounded-xl transition-all ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clientes" element={<Clients />} />
                <Route path="/prestamos" element={<Loans />} />
                <Route path="/inventario" element={<Inventory />} />
                <Route path="/caja" element={<Cashier />} />
                <Route path="/configuracion" element={<SettingsPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
    </div>
  );
};

// Login Component
const Login = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="max-w-md w-full">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-xl shadow-indigo-100">P</div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">PrendaPro</h1>
        <p className="text-gray-500 mt-2 text-lg">Sistema de Gestión de Casas de Empeño</p>
      </div>
      
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Bienvenido de nuevo</h2>
        <button 
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 py-4 px-6 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-indigo-100 transition-all group"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Continuar con Google
        </button>
        
        <p className="text-center text-gray-400 text-sm mt-8">
          Al continuar, aceptas nuestros <a href="#" className="text-indigo-600 hover:underline">Términos de Servicio</a>
        </p>
      </div>
      
      <div className="mt-12 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-indigo-600 font-bold text-xl">100%</div>
          <div className="text-gray-400 text-xs uppercase font-bold tracking-widest">Seguro</div>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-indigo-600 font-bold text-xl">IA</div>
          <div className="text-gray-400 text-xs uppercase font-bold tracking-widest">Potenciado</div>
        </div>
        <div className="text-center">
          <div className="text-indigo-600 font-bold text-xl">24/7</div>
          <div className="text-gray-400 text-xs uppercase font-bold tracking-widest">Soporte</div>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user profile
        const userDoc = await firestoreService.getDocument<UserProfile>('usuarios', currentUser.uid);
        if (userDoc) {
          setProfile(userDoc);
        } else {
          // Create default profile for first-time login
          const isDefaultAdmin = currentUser.email === "martin.tavarez.gomez@gmail.com";
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: isDefaultAdmin ? 'admin' : 'cajero',
            permissions: {
              verHistorial: true,
              modificarPrestamos: isDefaultAdmin,
              modificarClientes: true
            }
          };
          await firestoreService.setDocument('usuarios', currentUser.uid, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-600 font-bold animate-pulse">Cargando PrendaPro...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <MainLayout user={user} profile={profile} onLogout={handleLogout} />
        )}
      </ErrorBoundary>
    </Router>
  );
}
