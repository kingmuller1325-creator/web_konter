import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Category, PaginatedResponse } from '../../types';

export function CategoriesPage() {
  const { data, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Category>>('/categories');
      return res.data?.data || [];
    },
  });

  const categories = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
          <p className="text-gray-600 mt-1">Kelola kategori produk</p>
        </div>
        <button className="btn-primary">Tambah Kategori</button>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Kategori</h2>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : categories.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Slug</th>
                    <th>Urutan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category: any) => (
                    <tr key={category.id}>
                      <td className="font-medium">{category.name}</td>
                      <td>{category.slug}</td>
                      <td>{category.sortOrder}</td>
                      <td>
                        <span className={`badge ${category.isActive ? 'badge-success' : 'badge-gray'}`}>
                          {category.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <p className="empty-state-title">Belum ada kategori</p>
              <p className="empty-state-description">Tambahkan kategori pertama Anda</p>
              <button className="btn-primary mt-2">Tambah Kategori</button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}