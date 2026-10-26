import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Transaction, PaginatedResponse } from '../../types';

export function TransactionsPage() {
  const { data, isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Transaction>>('/transactions');
      return res.data?.data || [];
    },
  });

  const transactions = data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
        <p className="text-gray-600 mt-1">Riwayat transaksi</p>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Transaksi</h2>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : transactions.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>Pembayaran</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn: any) => (
                    <tr key={txn.id}>
                      <td>{formatDateTime(txn.createdAt)}</td>
                      <td>{txn.customer?.name || 'Umum'}</td>
                      <td className="font-medium">{formatCurrency(txn.total)}</td>
                      <td>
                        <span className="badge badge-gray">{txn.paymentMethod}</span>
                      </td>
                      <td>
                        <span className={`badge ${txn.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                          {txn.status === 'COMPLETED' ? 'Selesai' : 'Dibatalkan'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <p className="empty-state-title">Belum ada transaksi</p>
              <p className="empty-state-description">Transaksi akan muncul di sini</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}