import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import { getTodayDate } from '../../utils/format';

interface SalesSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

interface SalesReportResponse {
  summary: SalesSummary;
}

export function ReportsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const today = getTodayDate();

  const { data: salesData, isLoading } = useQuery<SalesReportResponse>({
    queryKey: ['reports', 'sales', 'today'],
    queryFn: async () => {
      const res = await api.get('/reports/sales?startDate=' + today + '&endDate=' + today);
      return (res.data as any) || { summary: {} as SalesSummary };
    },
    enabled: isAdmin,
  });

  const sales = salesData?.summary || {} as SalesSummary;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-600 mt-1">Hanya dapat diakses oleh Admin</p>
        </div>
        <Card className="p-6">
          <p className="text-gray-600">Akses terbatas</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <p className="text-gray-600 mt-1">Laporan penjualan dan keuangan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Transaksi</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sales.totalTransactions || 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Pendapatan</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{formatCurrency(sales.totalRevenue || 0)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Modal</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">{formatCurrency(sales.totalCost || 0)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Keuntungan</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{formatCurrency(sales.totalProfit || 0)}</p>
        </Card>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Laporan Hari Ini</h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : (
            <p className="text-gray-600">Halaman laporan dalam pengembangan</p>
          )}
        </div>
      </Card>
    </div>
  );
}