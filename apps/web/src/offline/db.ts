import Dexie, { type Table } from 'dexie';
import { Category, Customer, OutboxTransaction, Product } from '../types';

export interface MetaRecord {
  key: string;
  value: unknown;
}

/**
 * Local IndexedDB database used by the POS.
 *
 * Products/categories/customers are read-only caches pulled from the server so
 * the cashier can keep selling while offline. Transactions are written to the
 * `outbox` and are only removed after the server confirms them.
 */
class KonterosDatabase extends Dexie {
  products!: Table<Product, string>;
  categories!: Table<Category, string>;
  customers!: Table<Customer, string>;
  outbox!: Table<OutboxTransaction, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('konteros-offline');
    this.version(1).stores({
      products: 'id, sku, barcode, name, categoryId, isActive, updatedAt',
      categories: 'id, name, sortOrder, isActive',
      customers: 'id, name, phone, updatedAt',
      outbox: 'clientTxnId, status, timestamp',
      meta: 'key',
    });
  }
}

export const db = new KonterosDatabase();

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    costPrice: typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : Number(product.costPrice || 0),
    sellPrice: typeof product.sellPrice === 'string' ? parseFloat(product.sellPrice) : Number(product.sellPrice || 0),
    stockQty: typeof product.stockQty === 'string' ? parseFloat(product.stockQty) : Number(product.stockQty || 0),
    minStock: typeof product.minStock === 'string' ? parseFloat(product.minStock) : Number(product.minStock || 0),
  };
}

export async function cacheProducts(products: Product[]): Promise<void> {
  if (!products.length) return;
  const normalized = products.map(normalizeProduct);
  await db.transaction('rw', db.products, async () => {
    await db.products.bulkPut(normalized);
  });
}

export async function replaceCachedProducts(products: Product[]): Promise<void> {
  const normalized = products.map(normalizeProduct);
  await db.transaction('rw', db.products, async () => {
    await db.products.clear();
    if (normalized.length) {
      await db.products.bulkPut(normalized);
    }
  });
}

export const setProductsSnapshot = replaceCachedProducts;

export async function getCachedProducts(): Promise<Product[]> {
  const products = await db.products.toArray();
  return products.map(normalizeProduct);
}

export async function cacheCategories(categories: Category[]): Promise<void> {
  if (!categories.length) return;
  await db.categories.bulkPut(categories);
}

export async function getCachedCategories(): Promise<Category[]> {
  return db.categories.orderBy('sortOrder').toArray();
}

export async function cacheCustomers(customers: Customer[]): Promise<void> {
  if (!customers.length) return;
  await db.customers.bulkPut(customers);
}

export async function getCachedCustomers(): Promise<Customer[]> {
  return db.customers.toArray();
}

export async function decrementCachedStock(items: { productId: string; qty: number }[]): Promise<void> {
  if (!items.length) return;
  await db.transaction('rw', db.products, async () => {
    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (!product) continue;
      if (product.isDigital) continue;
      const qty = Number(item.qty || 0);
      if (qty <= 0) continue;
      const currentStock = typeof product.stockQty === 'string' ? parseFloat(product.stockQty) : Number(product.stockQty || 0);
      await db.products.put({
        ...product,
        stockQty: Math.max(0, currentStock - qty),
      });
    }
  });
}

export async function addToOutbox(item: OutboxTransaction): Promise<void> {
  await db.outbox.put(item);
}

export async function getOutbox(): Promise<OutboxTransaction[]> {
  return db.outbox.orderBy('timestamp').toArray();
}

export async function getOutboxCount(): Promise<number> {
  return db.outbox.count();
}

export async function markOutboxFailed(clientTxnId: string, error: string): Promise<void> {
  const item = await db.outbox.get(clientTxnId);
  if (!item) return;
  await db.outbox.put({
    ...item,
    status: 'failed',
    attempts: (item.attempts || 0) + 1,
    lastError: error,
  });
}

export async function removeFromOutbox(clientTxnId: string): Promise<void> {
  await db.outbox.delete(clientTxnId);
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const record = await db.meta.get(key);
  return record?.value as T | undefined;
}

export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    db.products.clear(),
    db.categories.clear(),
    db.customers.clear(),
    db.meta.clear(),
  ]);
}
