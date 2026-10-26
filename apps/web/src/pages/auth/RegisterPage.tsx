import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiBuilding, FiAlertCircle } from '../../icons';
import toast from 'react-hot-toast';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.string().email('Email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    confirmPassword: z.string(),
    outletName: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || value.length >= 2, 'Nama outlet minimal 2 karakter')
      .optional(),
    outletAddress: z.string().optional(),
    outletPhone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      outletName: '',
      outletAddress: '',
      outletPhone: '',
    },
  });

  // Check whether the initial setup has already been completed. The API is
  // public, so this works before login.
  useEffect(() => {
    let cancelled = false;
    api.get<{ setupCompleted: boolean; userCount: number }>('/auth/setup-status').then((res) => {
      if (!cancelled && res.success) {
        setSetupCompleted(Boolean(res.data?.setupCompleted));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Clear a stale server error once the user edits the form.
  // IMPORTANT: never call the store setter directly during render, it causes
  // an infinite re-render loop and freezes the page.
  const watchedName = watch('name');
  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  useEffect(() => {
    if (error) {
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName, watchedEmail, watchedPassword]);

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        outletName: data.outletName,
        outletAddress: data.outletAddress,
        outletPhone: data.outletPhone,
      });
      toast.success('Registrasi berhasil! Selamat datang.');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registrasi gagal';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h1>
        <p className="mt-2 text-gray-600">Daftar untuk memulai menggunakan Konteros POS</p>
      </div>

      {setupCompleted && (
        <div
          className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-lg text-warning-800 text-sm"
          role="status"
        >
          <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Registrasi publik sudah ditutup</p>
            <p className="mt-1">
              Aplikasi ini sudah memiliki admin. Akun baru dibuat oleh admin dari menu{' '}
              <span className="font-medium">Pengaturan &rarr; Pengguna</span>.{' '}
              <Link to="/login" className="underline font-medium">
                Masuk di sini
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm"
          role="alert"
        >
          <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Informasi Pengguna</h3>
          <div className="space-y-4">
            <Input
              {...register('name')}
              label="Nama Lengkap"
              type="text"
              placeholder="Nama Anda"
              autoComplete="name"
              leftIcon={<FiUser className="w-5 h-5" />}
              error={errors.name?.message}
              disabled={isLoading}
            />

            <Input
              {...register('email')}
              label="Email"
              type="email"
              placeholder="email@domain.com"
              autoComplete="email"
              leftIcon={<FiMail className="w-5 h-5" />}
              error={errors.email?.message}
              disabled={isLoading}
            />

            <Input
              {...register('password')}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              leftIcon={<FiLock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="pointer-events-auto p-2 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              }
              error={errors.password?.message}
              disabled={isLoading}
            />

            <Input
              {...register('confirmPassword')}
              label="Konfirmasi Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Ulangi password"
              autoComplete="new-password"
              leftIcon={<FiLock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="pointer-events-auto p-2 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={
                    showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'
                  }
                  aria-pressed={showConfirmPassword}
                  title={
                    showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'
                  }
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="w-5 h-5" />
                  ) : (
                    <FiEye className="w-5 h-5" />
                  )}
                </button>
              }
              error={errors.confirmPassword?.message}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Informasi Outlet (Opsional)</h3>
          <p className="text-sm text-green-700 mb-4">
            Isi jika ini adalah outlet pertama Anda. Bisa diisi nanti dari pengaturan.
          </p>
          <div className="space-y-4">
            <Input
              {...register('outletName')}
              label="Nama Outlet"
              type="text"
              placeholder="Contoh: Konter Pulsa Budi"
              leftIcon={<FiBuilding className="w-5 h-5" />}
              error={errors.outletName?.message}
              disabled={isLoading}
            />

            <Input
              {...register('outletAddress')}
              label="Alamat"
              type="text"
              placeholder="Jl. Raya No. 123, Jakarta"
              disabled={isLoading}
            />

            <Input
              {...register('outletPhone')}
              label="Telepon"
              type="tel"
              placeholder="081234567890"
              disabled={isLoading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Daftar
        </Button>
      </div>

      <p className="text-center text-sm text-gray-600">
        Sudah punya akun?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
          Masuk di sini
        </Link>
      </p>

      <p className="text-center text-xs text-gray-500">
        Catatan: Registrasi hanya untuk setup awal outlet. Jika outlet sudah memiliki admin, silakan
        minta admin untuk membuat akun Anda dari menu Pengaturan &rarr; Pengguna.
      </p>
    </form>
  );
}
