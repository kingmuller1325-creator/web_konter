import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/format';

interface InventorySummary {
  totalProducts: number;
  lowStockCount: number;
  totalStockValue: number;
}

export function InventoryPage() {
  const { data, isLoading } = useQuery<InventorySummary>({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => {
      const res = await api.get('/inventory/summary');
      return (res.data as any) || { totalProducts: 0, lowStockCount: 0, totalStockValue: 0 };
    },
  });

  const summary = data || { totalProducts: 0, lowStockCount: 0, totalStockValue: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventori</h1>
        <p className="text-gray-600 mt-1">Kelola stok dan pergerakan barang</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Produk</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalProducts || 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Stok Rendah</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">{summary.lowStockCount || 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Nilai Stok</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{formatCurrency(summary.totalStockValue || 0)}</p>
        </Card>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Ringkasan Inventori</h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : (
            <p className="text-gray-600">Halaman inventori dalam pengembangan</p>
          )}
        </div>
      </Card>
    </div>
  );
}