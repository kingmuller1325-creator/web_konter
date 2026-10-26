import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { api, getApiErrorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { PaginatedResponse, Role, User } from '../../types';
import {
  FiUserPlus,
  FiUsers,
  FiEye,
  FiEyeOff,
  FiTrash,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from '../../icons';

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'CASHIER', 'TECHNICIAN']),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  CASHIER: 'Kasir',
  TECHNICIAN: 'Teknisi',
};

const roleBadgeClass: Record<Role, string> = {
  ADMIN: 'badge-primary',
  CASHIER: 'badge-success',
  TECHNICIAN: 'badge-warning',
};

async function fetchUsers() {
  const res = await api.get<PaginatedResponse<User>>('/users?limit=100');
  if (!res.success) {
    throw new Error(res.error?.message || 'Gagal memuat data pengguna');
  }
  return res.data?.data || [];
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'CASHIER',
    },
  });

  useEffect(() => {
    if (isModalOpen) {
      reset({ name: '', email: '', password: '', role: 'CASHIER' });
      setShowPassword(false);
    }
  }, [isModalOpen, reset]);

  const createMutation = useMutation({
    mutationFn: async (values: CreateUserForm) => {
      const res = await api.post<User>('/users', values);
      if (!res.success) {
        throw new Error(res.error?.message || 'Gagal membuat pengguna');
      }
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      toast.success(`Pengguna ${created?.name ?? ''} berhasil dibuat`);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (target: User) => {
      const res = await api.put<{ id: string; isActive: boolean }>(
        `/users/${target.id}/toggle-status`,
      );
      if (!res.success) {
        throw new Error(res.error?.message || 'Gagal mengubah status pengguna');
      }
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(updated?.isActive ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: User) => {
      const res = await api.delete<{ message: string }>(`/users/${target.id}`);
      if (!res.success) {
        throw new Error(res.error?.message || 'Gagal menghapus pengguna');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
      toast.success('Pengguna berhasil dihapus');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  const onSubmit = (values: CreateUserForm) => {
    createMutation.mutate(values);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600 mt-1">Pengaturan toko dan aplikasi</p>
        </div>
        <Card className="p-6">
          <div className="flex items-start gap-2 text-sm text-warning-800">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Hanya admin yang dapat membuka halaman pengaturan.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600 mt-1">Kelola akun pengguna dan pengaturan toko</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <FiUserPlus className="w-4 h-4" />
          Tambah Pengguna
        </Button>
      </div>

      <Card>
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiUsers className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Pengguna</h2>
          </div>
          <span className="badge badge-gray">{users.length} akun</span>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : isError ? (
            <div className="empty-state h-48">
              <p className="empty-state-title">Gagal memuat pengguna</p>
              <p className="empty-state-description">{getApiErrorMessage(error)}</p>
            </div>
          ) : users.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Peran</th>
                    <th>Status</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const isSelf = item.id === user?.id;
                    return (
                      <tr key={item.id}>
                        <td className="font-medium">
                          {item.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-gray-400">(Anda)</span>
                          )}
                        </td>
                        <td>{item.email}</td>
                        <td>
                          <span className={`badge ${roleBadgeClass[item.role]}`}>
                            {roleLabels[item.role]}
                          </span>
                        </td>
                        <td>
                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1 text-sm text-success-700">
                              <FiCheckCircle className="w-4 h-4" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                              <FiXCircle className="w-4 h-4" />
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={isSelf || toggleMutation.isPending}
                              onClick={() => toggleMutation.mutate(item)}
                              title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : undefined}
                            >
                              {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => setConfirmDelete(item)}
                              title={isSelf ? 'Tidak dapat menghapus akun sendiri' : undefined}
                            >
                              <FiTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state h-48">
              <p className="empty-state-title">Belum ada pengguna</p>
              <p className="empty-state-description">Tambahkan pengguna pertama Anda</p>
              <Button className="mt-2" onClick={() => setIsModalOpen(true)}>
                <FiUserPlus className="w-4 h-4" />
                Tambah Pengguna
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Create user modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Pengguna"
        description="Akun baru langsung dapat digunakan untuk masuk ke aplikasi."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            {...register('name')}
            label="Nama Lengkap"
            placeholder="Nama pengguna"
            autoComplete="name"
            error={errors.name?.message}
            disabled={createMutation.isPending}
          />
          <Input
            {...register('email')}
            label="Email"
            type="email"
            placeholder="pengguna@domain.com"
            autoComplete="off"
            error={errors.email?.message}
            disabled={createMutation.isPending}
          />
          <Input
            {...register('password')}
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
            error={errors.password?.message}
            disabled={createMutation.isPending}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="pointer-events-auto p-2 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            }
          />
          <div>
            <label htmlFor="role" className="label">
              Peran
            </label>
            <select
              id="role"
              className="input"
              {...register('role')}
              disabled={createMutation.isPending}
            >
              <option value="CASHIER">Kasir</option>
              <option value="TECHNICIAN">Teknisi</option>
              <option value="ADMIN">Admin</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-danger-600" role="alert">
                {errors.role.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus Pengguna"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Yakin ingin menghapus <span className="font-medium">{confirmDelete?.name}</span>? Tindakan
          ini tidak dapat dibatalkan.
        </p>
        <div className="flex items-center justify-end gap-3 pt-6">
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(null)}
            disabled={deleteMutation.isPending}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
