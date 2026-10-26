import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function CustomerFormPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Pelanggan</h1>
          <p className="text-gray-600 mt-1">Tambah atau edit pelanggan</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          Kembali
        </Button>
      </div>
      <Card className="p-6">
        <p className="text-gray-600">Form pelanggan dalam pengembangan</p>
      </Card>
    </div>
  );
}