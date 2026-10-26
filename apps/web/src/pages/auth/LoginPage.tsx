import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from '../../icons';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Clear a stale server error when the user edits the credentials.
  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  useEffect(() => {
    if (error) {
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedEmail, watchedPassword]);

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data);
      toast.success('Login berhasil!');
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Masuk ke Akun</h1>
        <p className="mt-2 text-gray-600">Masukkan kredensial Anda untuk melanjutkan</p>
      </div>

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
        <Input
          {...register('email')}
          label="Email"
          type="email"
          placeholder="admin@konteros.com"
          autoComplete="email"
          leftIcon={<FiMail className="w-5 h-5" />}
          error={errors.email?.message}
          disabled={isLoading}
        />

        <Input
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600" />
            <span className="text-sm text-gray-600">Ingat saya</span>
          </label>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Masuk
        </Button>
      </div>

      <p className="text-center text-sm text-gray-600">
        Belum punya akun?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
          Daftar di sini
        </Link>
      </p>

      {((import.meta as any).env?.DEV) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p className="font-medium">Akun Demo (hanya mode development):</p>
          <p>Admin: admin@konteros.com / admin123</p>
          <p>Kasir: kasir@konteros.com / kasir123</p>
        </div>
      )}
    </form>
  );
}
