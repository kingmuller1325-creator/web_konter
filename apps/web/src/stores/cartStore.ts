import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartState, Product, Customer, PaymentMethod } from '../types';

interface CartStore extends CartState {
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  setCustomer: (customer?: Customer) => void;
  setDiscount: (discount: number) => void;
  setNote: (note: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  updatePayment: (index: number, payment: { method: PaymentMethod; amount: number; reference?: string }) => void;
  addPayment: (payment: { method: PaymentMethod; amount: number; reference?: string }) => void;
  removePayment: (index: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getTotal: () => number;
  getPaymentTotal: () => number;
  isPaymentComplete: () => boolean;
  getChange: () => number;
}

const initialState: CartState = {
  items: [],
  customerId: undefined,
  customer: undefined,
  discount: 0,
  note: '',
  paymentMethod: 'CASH',
  payments: [],
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (product, qty = 1) => {
        const { items } = get();
        const existingIndex = items.findIndex((item) => item.product.id === product.id);

        if (existingIndex >= 0) {
          const newItems = [...items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            qty: newItems[existingIndex].qty + qty,
          };
          set({ items: newItems });
        } else {
          set({ items: [...items, { product, qty, discount: 0 }] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.product.id !== productId) });
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, qty } : item
          ),
        });
      },

      updateDiscount: (productId, discount) => {
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item
          ),
        });
      },

      setCustomer: (customer) => {
        set({ 
          customerId: customer?.id, 
          customer 
        });
      },

      setDiscount: (discount) => {
        set({ discount: Math.max(0, discount) });
      },

      setNote: (note) => {
        set({ note });
      },

      setPaymentMethod: (method) => {
        set({ paymentMethod: method });
        // Reset payments when method changes
        if (method !== 'SPLIT') {
          set({ payments: [] });
        }
      },

      updatePayment: (index, payment) => {
        const { payments } = get();
        if (index >= 0 && index < payments.length) {
          const newPayments = [...payments];
          newPayments[index] = payment;
          set({ payments: newPayments });
        }
      },

      addPayment: (payment) => {
        set({ payments: [...get().payments, payment] });
      },

      removePayment: (index) => {
        set({ payments: get().payments.filter((_, i) => i !== index) });
      },

      clearCart: () => {
        set(initialState);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          return sum + item.product.sellPrice * item.qty - item.discount;
        }, 0);
      },

      getTotalDiscount: () => {
        const itemDiscounts = get().items.reduce((sum, item) => sum + item.discount, 0);
        return itemDiscounts + get().discount;
      },

      getTotal: () => {
        return get().getSubtotal() - get().discount;
      },

      getPaymentTotal: () => {
        return get().payments.reduce((sum, p) => sum + p.amount, 0);
      },

      isPaymentComplete: () => {
        const { paymentMethod, getTotal } = get();
        if (paymentMethod === 'SPLIT') {
          return get().getPaymentTotal() >= getTotal() - 0.01;
        }
        return get().getPaymentTotal() >= getTotal() - 0.01;
      },

      getChange: () => {
        return Math.max(0, get().getPaymentTotal() - get().getTotal());
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);