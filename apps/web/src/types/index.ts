// Core types matching the backend API

export type Role = 'ADMIN' | 'CASHIER' | 'TECHNICIAN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  outletId: string;
  outlet?: Outlet;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Outlet {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  outletId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  outletId: string;
  categoryId?: string;
  category?: Pick<Category, 'id' | 'name'> | Category;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockQty: number;
  minStock: number;
  isActive: boolean;
  isDigital: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  outletId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
}

export interface StockMovement {
  id: string;
  outletId: string;
  productId: string;
  product?: Product;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  qty: number;
  refType?: string;
  refId?: string;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

export type TransactionStatus = 'COMPLETED' | 'VOIDED' | 'PENDING_SYNC' | 'FAILED';
export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'EWALLET' | 'SPLIT';

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  product?: Product;
  productName: string;
  productSku: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  transactionId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  clientTxnId: string;
  outletId: string;
  cashierId?: string;
  cashier?: Pick<User, 'id' | 'name'>;
  customerId?: string;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  shiftId?: string;
  shift?: Pick<Shift, 'id' | 'openedAt'>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  note?: string;
  createdAt: string;
  syncedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  items: TransactionItem[];
  payments: Payment[];
}

export interface Shift {
  id: string;
  outletId: string;
  cashierId: string;
  cashier?: Pick<User, 'id' | 'name'>;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  transactions?: Transaction[];
  _count?: { transactions: number };
}

export interface SyncMetadata {
  entity: string;
  lastSyncedAt: string;
  lastPulledAt?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, any>;
}

// Auth payloads
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  outletName?: string;
  outletAddress?: string;
  outletPhone?: string;
}

// POS Cart types
export interface CartItem {
  product: Product;
  qty: number;
  discount: number;
}

export interface CartState {
  items: CartItem[];
  customerId?: string;
  customer?: Customer;
  discount: number;
  note: string;
  paymentMethod: PaymentMethod;
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
}

// Offline types
export interface ReceiptData {
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  cashierName: string;
  customerName?: string;
  clientTxnId: string;
  invoiceNumber?: string;
  createdAt: string;
  items: {
    name: string;
    sku?: string;
    qty: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
  cashReceived?: number;
  change?: number;
  note?: string;
  isOffline: boolean;
}

export interface OutboxTransaction {
  clientTxnId: string;
  payload: CreateTransactionPayload;
  receipt: ReceiptData;
  timestamp: number;
  status: 'pending' | 'failed';
  attempts: number;
  lastError?: string;
}

/** Payload accepted by POST /transactions (matches CreateTransactionDto). */
export interface CreateTransactionPayload {
  clientTxnId: string;
  customerId?: string;
  shiftId?: string;
  items: {
    productId: string;
    qty: number;
    unitPrice: number;
    discount: number;
  }[];
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
  discount: number;
  note?: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

// Report types
export interface SalesReport {
  period: { startDate: string; endDate: string };
  summary: {
    totalTransactions: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageTransaction: number;
  };
  daily: { date: string; revenue: number; transactions: number; profit: number }[];
  byCategory: { category: string; qty: number; revenue: number; cost: number; profit: number }[];
  byCashier: { cashier: string; transactions: number; revenue: number }[];
  byPaymentMethod: { method: string; count: number; total: number }[];
}

export interface ProductReport {
  period: { startDate: string; endDate: string };
  products: {
    productId: string;
    sku: string;
    name: string;
    category: string;
    qty: number;
    revenue: number;
    cost: number;
    profit: number;
    avgPrice: number;
  }[];
}

export interface StockReport {
  products: {
    id: string;
    sku: string;
    barcode?: string;
    name: string;
    category: string;
    unit: string;
    stockQty: number;
    minStock: number;
    costPrice: number;
    sellPrice: number;
    isDigital: boolean;
    isLowStock: boolean;
    isOutOfStock: boolean;
    stockValue: number;
  }[];
  summary: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
  };
}

export interface ProfitLossReport {
  period: { startDate: string; endDate: string };
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
}

export interface DailySummary {
  date: string;
  totalTransactions: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  topProducts: { productId: string; qty: number; revenue: number; profit: number }[];
}

// Settings
export interface Settings {
  receipt_header?: string;
  receipt_subheader?: string;
  receipt_footer?: string;
  tax_rate?: number;
  low_stock_threshold?: number;
  auto_print_receipt?: boolean;
  currency?: string;
  timezone?: string;
  [key: string]: any;
}
