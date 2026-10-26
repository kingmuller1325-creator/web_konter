import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function ShiftDetailPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detail Shift</h1>
          <p className="text-gray-600 mt-1">Informasi detail shift</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/shifts')}>
          Kembali
        </Button>
      </div>
      <Card className="p-6">
        <p className="text-gray-600">Detail shift dalam pengembangan</p>
      </Card>
    </div>
  );
}