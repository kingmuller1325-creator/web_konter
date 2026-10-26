import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Customer, PaginatedResponse } from '../../types';

export function CustomersPage() {
  const { data, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Customer>>('/customers');
      return res.data?.data || [];
    },
  });

  const customers = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
          <p className="text-gray-600 mt-1">Kelola data pelanggan</p>
        </div>
        <a href="/customers/new" className="btn-primary">
          Tambah Pelanggan
        </a>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Pelanggan</h2>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : customers.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>No. Telepon</th>
                    <th>Email</th>
                    <th>Alamat</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer: any) => (
                    <tr key={customer.id}>
                      <td className="font-medium">{customer.name}</td>
                      <td>{customer.phone || '-'}</td>
                      <td>{customer.email || '-'}</td>
                      <td>{customer.address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <p className="empty-state-title">Belum ada pelanggan</p>
              <p className="empty-state-description">Tambahkan pelanggan pertama Anda</p>
              <a href="/customers/new" className="btn-primary mt-2">Tambah Pelanggan</a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}