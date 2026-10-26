import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, initAuth } from './stores/authStore';
import { initSync } from './stores/syncStore';
import { useEffect } from 'react';

// Layouts
import { MainLayout } from './components/layouts/MainLayout';
import { AuthLayout } from './components/layouts/AuthLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { POSPage } from './pages/pos/POSPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { CategoriesPage } from './pages/products/CategoriesPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerFormPage } from './pages/customers/CustomerFormPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { TransactionDetailPage } from './pages/transactions/TransactionDetailPage';
import { ShiftsPage } from './pages/shifts/ShiftsPage';
import { ShiftDetailPage } from './pages/shifts/ShiftDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ModulesPage } from './pages/ModulesPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  // Initialize auth and sync on app mount
  useEffect(() => {
    initAuth();
    initSync();
  }, []);

  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />} />
      </Route>

      {/* Protected routes */}
      <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* POS */}
        <Route path="/pos" element={<POSPage />} />

        {/* Products & Categories */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
        <Route path="/categories" element={<CategoriesPage />} />

        {/* Inventory */}
        <Route path="/inventory" element={<InventoryPage />} />

        {/* Customers */}
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />

        {/* Transactions */}
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailPage />} />

        {/* Shifts */}
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/shifts/:id" element={<ShiftDetailPage />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Modules (feature toggle) */}
        <Route path="/modules" element={<ModulesPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;