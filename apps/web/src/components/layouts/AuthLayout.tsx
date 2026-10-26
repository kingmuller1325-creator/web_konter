import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">K</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Konteros POS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Aplikasi POS Konter Pulsa & Multi-Layanan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-xl sm:px-10 border border-gray-200">
          <Outlet />
        </div>
        
        <p className="mt-6 text-center text-xs text-gray-500">
          Versi 1.0.0 &copy; 2024 Konteros
        </p>
      </div>
    </div>
  );
}