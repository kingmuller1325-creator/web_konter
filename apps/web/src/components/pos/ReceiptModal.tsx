import { Modal } from '../ui/Modal';
import { FiPrinter } from '../../icons';
import { ReceiptData } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  onPrint: () => void;
}

export function ReceiptModal({ isOpen, onClose, data, onPrint }: ReceiptModalProps) {
  if (!isOpen || !data) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Struk Pembelian"
      size="sm"
      showCloseButton={true}
    >
      <div className="space-y-4" id="receipt-content">
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-4">
          <p className="font-bold text-lg">{data.outletName}</p>
          {data.outletAddress && <p className="text-sm text-gray-600">{data.outletAddress}</p>}
          {data.outletPhone && <p className="text-sm text-gray-600">{data.outletPhone}</p>}
          <hr className="my-2 border-dotted border-gray-300" />
          <p className="text-xs text-gray-500">
            {data.isOffline ? '(OFFLINE) ' : ''}Kasir: {data.cashierName}
          </p>
          {data.customerName && (
            <p className="text-xs text-gray-500">Pelanggan: {data.customerName}</p>
          )}
          <p className="text-xs text-gray-500">
            {formatDateTime(data.createdAt)}
          </p>
          {data.invoiceNumber && (
            <p className="text-xs text-gray-500 mt-1">No. Invoice: {data.invoiceNumber}</p>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2">
          {data.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                {item.sku && <p className="text-xs text-gray-500">{item.sku}</p>}
                <p className="text-xs text-gray-500">
                  {item.qty} x {formatCurrency(item.unitPrice)}
                  {item.discount > 0 && ` - disc ${formatCurrency(item.discount)}`}
                </p>
              </div>
              <p className="font-medium text-gray-900">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </div>

        <hr className="border-dotted border-gray-300" />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(data.subtotal)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-success-600">
              <span>Diskon</span>
              <span className="font-medium">-{formatCurrency(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-lg pt-1 border-t border-gray-200">
            <span>TOTAL</span>
            <span>{formatCurrency(data.total)}</span>
          </div>
        </div>

        <hr className="border-dotted border-gray-300" />

        {/* Payments */}
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-900">Pembayaran:</p>
          {data.payments.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span className="text-gray-600 capitalize">{p.method.toLowerCase()}</span>
              <span className="font-medium">{formatCurrency(p.amount)}</span>
            </div>
          ))}
          {data.paymentMethod === 'CASH' && data.cashReceived !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tunai Diterima</span>
              <span className="font-medium">{formatCurrency(data.cashReceived)}</span>
            </div>
          )}
          {data.paymentMethod === 'CASH' && data.change !== undefined && (
            <div className="flex justify-between text-sm text-success-600">
              <span>Kembalian</span>
              <span className="font-medium">{formatCurrency(data.change)}</span>
            </div>
          )}
        </div>

        {data.note && (
          <div className="pt-2 border-t border-dotted border-gray-300">
            <p className="text-xs text-gray-500">Catatan: {data.note}</p>
          </div>
        )}

        {/* Print button */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={onPrint}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <FiPrinter className="w-4 h-4" />
            Cetak Struk
          </button>
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}