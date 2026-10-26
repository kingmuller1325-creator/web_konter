import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { useCartStore } from '../../stores/cartStore';
import { useState } from 'react';
import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiTag,
  FiDatabase,
  FiUsers,
  FiReceipt,
  FiClock,
  FiBarChart,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
} from '../../icons';
import toast from 'react-hot-toast';

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const { isOnline, pendingCount, sync, syncStatus } = useSyncStore();
  const { clearCart } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      clearCart();
      navigate('/login');
      toast.success('Berhasil logout');
    } catch {
      toast.error('Gagal logout');
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome, roles: ['ADMIN', 'CASHIER', 'TECHNICIAN'] },
    { name: 'POS Kasir', href: '/pos', icon: FiShoppingCart, roles: ['ADMIN', 'CASHIER'] },
    { name: 'Produk', href: '/products', icon: FiPackage, roles: ['ADMIN', 'CASHIER'] },
    { name: 'Kategori', href: '/categories', icon: FiTag, roles: ['ADMIN'] },
    { name: 'Inventori', href: '/inventory', icon: FiDatabase, roles: ['ADMIN'] },
    { name: 'Pelanggan', href: '/customers', icon: FiUsers, roles: ['ADMIN', 'CASHIER'] },
    { name: 'Transaksi', href: '/transactions', icon: FiReceipt, roles: ['ADMIN', 'CASHIER'] },
    { name: 'Shift', href: '/shifts', icon: FiClock, roles: ['ADMIN', 'CASHIER'] },
    { name: 'Laporan', href: '/reports', icon: FiBarChart, roles: ['ADMIN'] },
    { name: 'Pengaturan', href: '/settings', icon: FiSettings, roles: ['ADMIN'] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role || '')
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-semibold text-gray-900 text-lg">Konteros</span>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User & Status */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            {/* Connection Status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div
                className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-success-500' : 'bg-danger-500'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {isOnline ? 'Terhubung' : 'Offline'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {pendingCount > 0
                    ? `${pendingCount} transaksi menunggu sync`
                    : 'Semua tersinkronisasi'}
                </p>
              </div>
              {!isOnline && (
                <span className="badge badge-warning text-xs">Offline</span>
              )}
              {pendingCount > 0 && isOnline && (
                <button
                  onClick={sync}
                  disabled={syncStatus === 'syncing'}
                  className="btn-primary text-xs px-3 py-1"
                >
                  {syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Sinkronkan'}
                </button>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role.toLowerCase()}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Logout"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        id="sidebar-overlay"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
                {filteredNavigation.find((n) => n.href === location.pathname)?.name || 'Konteros'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Sync status indicator */}
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success-500' : 'bg-danger-500'}`}
                />
                <span className="text-xs text-gray-500">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {pendingCount > 0 && (
                  <span className="badge badge-warning text-xs">
                    {pendingCount} pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}