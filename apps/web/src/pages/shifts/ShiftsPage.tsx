import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Shift, PaginatedResponse } from '../../types';

export function ShiftsPage() {
  const { data, isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Shift>>('/shifts');
      return res.data?.data || [];
    },
  });

  const shifts = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift</h1>
          <p className="text-gray-600 mt-1">Kelola shift kasir</p>
        </div>
        <button className="btn-primary">Buka Shift</button>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Shift</h2>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : shifts.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kasir</th>
                    <th>Mulai</th>
                    <th>Selesai</th>
                    <th>Kas Awal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift: any) => (
                    <tr key={shift.id}>
                      <td className="font-medium">{shift.cashier?.name}</td>
                      <td>{formatDateTime(shift.openedAt)}</td>
                      <td>{shift.closedAt ? formatDateTime(shift.closedAt) : '-'}</td>
                      <td>{formatCurrency(shift.openingCash)}</td>
                      <td>
                        <span className={`badge ${shift.status === 'OPEN' ? 'badge-success' : 'badge-gray'}`}>
                          {shift.status === 'OPEN' ? 'Buka' : 'Tutup'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <p className="empty-state-title">Belum ada shift</p>
              <p className="empty-state-description">Buka shift pertama Anda</p>
              <button className="btn-primary mt-2">Buka Shift</button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}