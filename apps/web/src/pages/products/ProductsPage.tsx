import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/format';
import { Product, PaginatedResponse } from '../../types';

export function ProductsPage() {
  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Product>>('/products');
      return res.data?.data || [];
    },
  });

  const products = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-gray-600 mt-1">Kelola daftar produk</p>
        </div>
        <a href="/products/new" className="btn-primary">
          Tambah Produk
        </a>
      </div>

      <Card>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Produk</h2>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : products.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Nama</th>
                    <th>Harga Jual</th>
                    <th>Stok</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: any) => (
                    <tr key={product.id}>
                      <td className="font-medium">{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{formatCurrency(product.sellPrice)}</td>
                      <td>{product.stockQty}</td>
                      <td>
                        <span className={`badge ${product.isActive ? 'badge-success' : 'badge-gray'}`}>
                          {product.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <p className="empty-state-title">Belum ada produk</p>
              <p className="empty-state-description">Tambahkan produk pertama Anda</p>
              <a href="/products/new" className="btn-primary mt-2">Tambah Produk</a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}