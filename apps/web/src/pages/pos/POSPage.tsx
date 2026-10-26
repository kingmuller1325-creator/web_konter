import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Product, Category } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { formatCurrency } from '../../utils/format';
import { FiSearch, FiShoppingCart, FiPlus, FiMinus, FiTrash } from '../../icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { getCachedProducts, getCachedCategories, decrementCachedStock } from '../../offline/db';
import { ReceiptModal } from '../../components/pos/ReceiptModal';
import toast from 'react-hot-toast';

export function POSPage() {
  const { user } = useAuthStore();
  const { isOnline, addPendingTransaction, pendingCount } = useSyncStore();
  const {
    items,
    addItem,
    removeItem,
    updateQty,
    customer,
    discount: cartDiscount,
    paymentMethod,
    setPaymentMethod,
    payments,
    addPayment,
    removePayment,
    clearCart,
    getSubtotal,
    getTotal,
    getPaymentTotal,
    isPaymentComplete,
    getChange,
  } = useCartStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentShift, setCurrentShift] = useState<any>(null);

  // Load cached products and categories
  useEffect(() => {
    const loadCached = async () => {
      const cachedProducts = await getCachedProducts();
      const cachedCategories = await getCachedCategories();
      setProducts(cachedProducts.filter((p) => p.isActive));
      setCategories(cachedCategories.filter((c) => c.isActive));
    };
    loadCached();
  }, []);

  // Fetch products from POS endpoint
  const { data: posProducts } = useQuery({
    queryKey: ['products', 'pos'],
    queryFn: () => api.get<Product[]>('/products/pos'),
    select: (res) => res.data || [],
    enabled: isOnline,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (isOnline && posProducts && posProducts.length > 0) {
      setProducts(posProducts.filter((p: Product) => p.isActive));
    }
  }, [posProducts, isOnline]);

  // Fetch categories
  const { data: posCategories } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => api.get<Category[]>('/categories/active'),
    select: (res) => res.data || [],
    enabled: isOnline,
  });

  useEffect(() => {
    if (isOnline && posCategories && posCategories.length > 0) {
      setCategories(posCategories.filter((c: Category) => c.isActive));
    }
  }, [posCategories, isOnline]);

  // Check current shift
  const { data: shiftData } = useQuery({
    queryKey: ['shift', 'current'],
    queryFn: () => api.get('/shifts/current'),
    select: (res) => res.data,
    enabled: isOnline,
  });

  useEffect(() => {
    if (shiftData) {
      setCurrentShift(shiftData);
    }
  }, [shiftData]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  const subtotal = getSubtotal();
  const total = getTotal();
  const paymentTotal = getPaymentTotal();

  const handleAddToCart = (product: Product) => {
    if (!product.isDigital && product.stockQty <= 0) {
      toast.error('Stok produk habis');
      return;
    }
    addItem(product);
  };

  const openShift = async () => {
    try {
      const response = await api.post('/shifts/open', { openingCash: 0 });
      if (response.success) {
        setCurrentShift(response.data);
        setShowShiftModal(false);
        toast.success('Shift berhasil dibuka');
      }
    } catch (error) {
      toast.error('Gagal membuka shift');
    }
  };

  const processPayment = async () => {
    if (items.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }
    if (!currentShift && isOnline) {
      setShowShiftModal(true);
      return;
    }
    if (paymentMethod === 'CASH') {
      const cash = parseFloat(cashAmount);
      if (isNaN(cash) || cash < total) {
        toast.error('Jumlah tunai tidak mencukupi');
        return;
      }
    }
    if (paymentMethod !== 'CASH' && payments.length === 0) {
      // For non-cash, create single payment
      addPayment({ method: paymentMethod, amount: total });
    }
    if (paymentMethod === 'SPLIT' && !isPaymentComplete()) {
      toast.error('Jumlah pembayaran split belum sesuai');
      return;
    }
    setShowPaymentModal(true);
  };

  const completeTransaction = async () => {
    setIsProcessing(true);
    try {
      const clientTxnId = crypto.randomUUID ? crypto.randomUUID() : 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const payload: any = {
        clientTxnId,
        items: items.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
          unitPrice: item.product.sellPrice,
          discount: item.discount,
        })),
        payments: paymentMethod === 'CASH' 
          ? [{ method: 'CASH', amount: total }]
          : paymentMethod === 'SPLIT'
          ? payments
          : [{ method: paymentMethod, amount: total }],
        discount: cartDiscount,
        note: '',
        paymentMethod,
        createdAt: new Date().toISOString(),
        customerId: customer?.id,
        shiftId: currentShift?.id,
      };

      const receipt: any = {
        outletName: user?.outlet?.name || 'Konteros',
        outletAddress: user?.outlet?.address,
        outletPhone: user?.outlet?.phone,
        cashierName: user?.name || '',
        customerName: customer?.name,
        clientTxnId,
        createdAt: new Date().toISOString(),
        items: items.map((item) => ({
          name: item.product.name,
          sku: item.product.sku,
          qty: item.qty,
          unitPrice: item.product.sellPrice,
          discount: item.discount,
          subtotal: item.product.sellPrice * item.qty - item.discount,
        })),
        subtotal,
        discount: cartDiscount,
        total,
        paymentMethod,
        payments: payload.payments,
        cashReceived: paymentMethod === 'CASH' ? parseFloat(cashAmount) : undefined,
        change: paymentMethod === 'CASH' ? getChange() : undefined,
        isOffline: !isOnline,
      };

      if (isOnline && currentShift) {
        const response = await api.post('/transactions', payload);
        if (response.success) {
          // Decrement local stock
          await decrementCachedStock(items.map((i) => ({ productId: i.product.id, qty: i.qty })));
          setReceiptData({ ...receipt, invoiceNumber: (response.data as any)?.invoiceNumber });
          clearCart();
          setShowPaymentModal(false);
          setShowReceiptModal(true);
          toast.success('Transaksi berhasil');
        } else {
          throw new Error(response.error?.message || 'Gagal');
        }
      } else {
        // Offline - add to outbox
        await addPendingTransaction({ payload, receipt, timestamp: Date.now(), status: 'pending', attempts: 0 });
        await decrementCachedStock(items.map((i) => ({ productId: i.product.id, qty: i.qty })));
        setReceiptData(receipt);
        clearCart();
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        toast.success('Transaksi disimpan offline, akan disinkronkan');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memproses transaksi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Cari produk (nama/SKU/barcode)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<FiSearch className="w-4 h-4" />}
              className="flex-1"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input w-full sm:w-48"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddToCart(product)}
                disabled={!product.isDigital && product.stockQty <= 0}
                className={`p-3 border rounded-lg text-left hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  !product.isDigital && product.stockQty <= 0 ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <div className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</div>
                <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                <div className="flex items-center justify-between">
                  <div className="text-primary-600 font-semibold text-sm">{formatCurrency(product.sellPrice)}</div>
                  {!product.isDigital && (
                    <div className={`text-xs ${product.stockQty <= product.minStock ? 'text-warning-600' : 'text-gray-500'}`}>
                      Stok: {product.stockQty}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </Card>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 flex flex-col">
        <Card className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiShoppingCart className="w-5 h-5" />
                Keranjang
              </h2>
              {items.length > 0 && (
                <button onClick={clearCart} className="text-sm text-danger-600 hover:text-danger-700">
                  Kosongkan
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{items.length} item</span>
              {currentShift ? (
                <span className="text-success-600">Shift: {currentShift.id.slice(0, 8)}</span>
              ) : (
                <span className="text-warning-600">Belum buka shift</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Keranjang kosong</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.product.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.product.sellPrice)}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="text-danger-600">
                      <FiTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        <FiMinus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        <FiPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.product.sellPrice * item.qty - item.discount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Diskon</span>
              <span className="font-medium">{formatCurrency(cartDiscount)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-primary-600">{formatCurrency(total)}</span>
            </div>
            <Button
              onClick={processPayment}
              className="w-full"
              disabled={items.length === 0 || isProcessing}
            >
              Bayar ({formatCurrency(total)})
            </Button>
            {!isOnline && (
              <p className="text-xs text-warning-600 text-center">Mode Offline - Transaksi akan disinkronkan</p>
            )}
            {pendingCount > 0 && (
              <p className="text-xs text-gray-500 text-center">{pendingCount} transaksi menunggu sync</p>
            )}
          </div>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pembayaran" size="md">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total Tagihan</span>
              <span className="text-xl font-semibold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="label">Metode Pembayaran</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="input"
            >
              <option value="CASH">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER">Transfer</option>
              <option value="EWALLET">E-Wallet</option>
              <option value="SPLIT">Split Payment</option>
            </select>
          </div>

          {paymentMethod === 'CASH' && (
            <div>
              <label className="label">Jumlah Tunai</label>
              <Input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Masukkan jumlah tunai"
              />
              {cashAmount && parseFloat(cashAmount) >= total && (
                <p className="text-sm text-success-600 mt-1">
                  Kembalian: {formatCurrency(parseFloat(cashAmount) - total)}
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'SPLIT' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Terbayar</span>
                <span className={paymentTotal >= total - 0.01 ? 'text-success-600' : 'text-warning-600'}>
                  {formatCurrency(paymentTotal)} / {formatCurrency(total)}
                </span>
              </div>
              {payments.map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm capitalize">{p.method.toLowerCase()}</span>
                  <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                  <button onClick={() => removePayment(i)} className="text-danger-600">
                    <FiTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPayment({ method: 'CASH', amount: total - paymentTotal })}
                disabled={paymentTotal >= total}
              >
                Tambah Pembayaran
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={completeTransaction}
              className="flex-1"
              loading={isProcessing}
              disabled={isProcessing}
            >
              Selesaikan Transaksi
            </Button>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shift Modal */}
      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title="Buka Shift" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600">Anda belum membuka shift. Silakan buka shift terlebih dahulu untuk melakukan transaksi.</p>
          <div className="flex gap-2">
            <Button onClick={openShift} className="flex-1">
              Buka Shift
            </Button>
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        data={receiptData}
        onPrint={handlePrint}
      />
    </div>
  );
}