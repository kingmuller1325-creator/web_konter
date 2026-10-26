import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { formatCurrency, formatNumber, getTodayDate } from '../../utils/format';
import { FiShoppingCart, FiDollarSign, FiUsers, FiPackage, FiTrendingUp, FiAlertTriangle } from '../../icons';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthStore } from '../../stores/authStore';

interface StockReport {
  products: Array<{
    id: string;
    name: string;
    stockQty: number;
    minStock: number;
    unit: string;
    isLowStock: boolean;
    isOutOfStock: boolean;
  }>;
  summary: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
  };
}

interface SalesReport {
  summary?: {
    totalRevenue: number;
    totalTransactions: number;
    totalProfit: number;
  };
  totalRevenue?: number;
  totalTransactions?: number;
  totalProfit?: number;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const today = getTodayDate();

  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReport>({
    queryKey: ['salesReport', 'today', user?.role],
    queryFn: async () => {
      if (isAdmin) {
        const res = await api.get('/reports/sales?startDate=' + today + '&endDate=' + today);
        return (res.data as any) || {};
      }
      const res = await api.get('/transactions/daily-summary?date=' + today);
      return (res.data as any) || {};
    },
  });

  const { data: stockReport, isLoading: stockLoading } = useQuery<StockReport>({
    queryKey: ['stockReport'],
    queryFn: async () => {
      const res = await api.get('/reports/stock');
      return (res.data as any) || { products: [], summary: { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0, totalStockValue: 0 } };
    },
    enabled: isAdmin,
  });

  const { data: transactions, isLoading: txnLoading } = useQuery<any>({
    queryKey: ['transactions', 'today', 5],
    queryFn: async () => {
      const res = await api.get('/transactions?limit=5&startDate=' + today + '&endDate=' + today);
      if (res.data && (res.data as any).data) {
        return (res.data as any);
      }
      return res.data;
    },
  });

  const isLoading = salesLoading || (isAdmin && stockLoading) || txnLoading;

  const todayRevenue = (salesReport as any)?.summary?.totalRevenue || (salesReport as any)?.totalRevenue || 0;
  const todayTransactions = (salesReport as any)?.summary?.totalTransactions || (salesReport as any)?.totalTransactions || 0;
  const todayProfit = (salesReport as any)?.summary?.totalProfit || (salesReport as any)?.totalProfit || 0;
  const lowStockCount = stockReport?.summary?.lowStockCount || 0;
  const outOfStockCount = stockReport?.summary?.outOfStockCount || 0;
  const totalProducts = stockReport?.summary?.totalProducts || 0;

  const stats = [
    {
      name: 'Pendapatan Hari Ini',
      value: formatCurrency(todayRevenue),
      icon: FiDollarSign,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    },
    {
      name: 'Transaksi Hari Ini',
      value: formatNumber(todayTransactions),
      icon: FiShoppingCart,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      name: 'Keuntungan Hari Ini',
      value: formatCurrency(todayProfit),
      icon: FiTrendingUp,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
    },
    {
      name: 'Total Produk',
      value: formatNumber(totalProducts),
      icon: FiPackage,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Ringkasan performa toko hari ini</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success-500" />
            Online
          </span>
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-8 w-32" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Alerts */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Peringatan Stok</h2>
            {lowStockCount > 0 || outOfStockCount > 0 ? (
              <span className="badge badge-danger">{lowStockCount + outOfStockCount} peringatan</span>
            ) : (
              <span className="badge badge-success">Normal</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (lowStockCount > 0 || outOfStockCount > 0) ? (
            <div className="space-y-3">
              {stockReport?.products
                ?.filter((p: any) => p.isLowStock || p.isOutOfStock)
                .slice(0, 5)
                .map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FiAlertTriangle className="w-5 h-5 text-warning-600" />
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {product.isOutOfStock ? 'Stok habis' : `Stok rendah: ${product.stockQty} (min: ${product.minStock})`}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${product.isOutOfStock ? 'badge-danger' : 'badge-warning'}`}>
                      {product.stockQty} {product.unit}
                    </span>
                  </div>
                ))}
              {(lowStockCount + outOfStockCount > 5) && (
                <a href="/inventory" className="text-sm text-primary-600 hover:text-primary-500 font-medium">
                  Lihat semua ({lowStockCount + outOfStockCount})
                </a>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FiPackage className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium">Stok aman</p>
              <p className="text-sm">Tidak ada produk dengan stok rendah</p>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="space-y-2">
            <a href="/pos" className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
              <FiShoppingCart className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-primary-700">Buka POS Kasir</span>
            </a>
            <a href="/products/new" className="flex items-center gap-3 p-3 bg-success-50 rounded-lg hover:bg-success-100 transition-colors">
              <FiPackage className="w-5 h-5 text-success-600" />
              <span className="font-medium text-success-700">Tambah Produk Baru</span>
            </a>
            <a href="/customers/new" className="flex items-center gap-3 p-3 bg-warning-50 rounded-lg hover:bg-warning-100 transition-colors">
              <FiUsers className="w-5 h-5 text-warning-600" />
              <span className="font-medium text-warning-700">Tambah Pelanggan</span>
            </a>
            <a href="/shifts" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <FiDollarSign className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Kelola Shift</span>
            </a>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Transaksi Terbaru</h2>
          <a href="/transactions" className="text-sm text-primary-600 hover:text-primary-500">Lihat semua</a>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 px-4" />
              ))}
            </div>
          ) : (transactions?.data || transactions)?.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Bayar</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(transactions?.data || transactions || []).map((txn: any) => (
                    <tr key={txn.id}>
                      <td className="whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {new Date(txn.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-gray-900">{txn.customer?.name || 'Umum'}</span>
                      </td>
                      <td className="text-sm text-gray-500">{txn.items?.length || 0} item</td>
                      <td className="font-medium text-gray-900">{formatCurrency(txn.total)}</td>
                      <td>
                        <span className="badge badge-gray">{txn.paymentMethod}</span>
                      </td>
                      <td>
                        <span className={`badge ${txn.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                          {txn.status === 'COMPLETED' ? 'Selesai' : txn.status === 'VOIDED' ? 'Dibatalkan' : txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <FiShoppingCart className="empty-state-icon w-12 h-12" />
              <p className="empty-state-title">Belum ada transaksi hari ini</p>
              <p className="empty-state-description">Transaksi akan muncul di sini setelah ada penjualan</p>
              <a href="/pos" className="btn-primary mt-2">Mulai Transaksi</a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}