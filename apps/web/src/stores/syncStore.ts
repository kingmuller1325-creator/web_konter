import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../services/api';
import { OutboxTransaction } from '../types';
import {
  addToOutbox,
  getOutbox,
  getOutboxCount,
  removeFromOutbox,
  cacheProducts,
  cacheCategories,
  cacheCustomers,
  setMeta,
  getMeta,
} from '../offline/db';
import { buildQueryString } from '../utils/format';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  syncError: string | null;
  deviceId: string;
  setOnlineStatus: (online: boolean) => void;
  addPendingTransaction: (tx: Omit<OutboxTransaction, 'clientTxnId'>) => Promise<string>;
  updatePendingTransaction: (clientTxnId: string, updates: Partial<OutboxTransaction>) => Promise<void>;
  removePendingTransaction: (clientTxnId: string) => Promise<void>;
  getPendingTransactions: () => Promise<OutboxTransaction[]>;
  sync: () => Promise<void>;
  pull: () => Promise<void>;
  loadPendingFromStorage: () => Promise<void>;
}

const DEVICE_ID_KEY = 'konteros_device_id';

function ensureDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const newDeviceId = 'device_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  return newDeviceId;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount: 0,
      lastSyncAt: null,
      syncStatus: 'idle',
      syncError: null,
      deviceId: typeof window !== 'undefined' ? localStorage.getItem(DEVICE_ID_KEY) || '' : '',

      setOnlineStatus: (online) => {
        set({ isOnline: online });
        if (online) {
          // Auto sync when coming online
          get().sync().catch(() => undefined);
        }
      },

      addPendingTransaction: async (tx) => {
        const clientTxnId = crypto.randomUUID ? crypto.randomUUID() : 'txn_' + Math.random().toString(36).slice(2) + '_' + Date.now();
        const fullTx: OutboxTransaction = {
          ...tx,
          clientTxnId,
          status: 'pending',
          attempts: 0,
          timestamp: Date.now(),
        };
        await addToOutbox(fullTx);
        const count = await getOutboxCount();
        set({ pendingCount: count });
        return clientTxnId;
      },

      updatePendingTransaction: async (clientTxnId, updates) => {
        const pending = await getOutbox();
        const item = pending.find((t) => t.clientTxnId === clientTxnId);
        if (item) {
          await addToOutbox({ ...item, ...updates });
          const count = await getOutboxCount();
          set({ pendingCount: count });
        }
      },

      removePendingTransaction: async (clientTxnId) => {
        await removeFromOutbox(clientTxnId);
        const count = await getOutboxCount();
        set({ pendingCount: count });
      },

      getPendingTransactions: async () => {
        return getOutbox();
      },

      sync: async () => {
        let { isOnline, deviceId } = get();
        if (!deviceId) {
          deviceId = ensureDeviceId();
          set({ deviceId });
        }
        if (!isOnline || !deviceId) return;

        const pending = await getOutbox();
        const pendingTxns = pending.filter((t) => t.status === 'pending');
        if (pendingTxns.length === 0) {
          // Still try to pull even if nothing to push
          await get().pull().catch(() => undefined);
          const count = await getOutboxCount();
          set({ pendingCount: count });
          return;
        }

        set({ syncStatus: 'syncing', syncError: null });

        try {
          const operations = pendingTxns.map((tx) => ({
            type: 'CREATE_TRANSACTION',
            clientTxnId: tx.clientTxnId,
            payload: tx.payload,
          }));

          const query = buildQueryString({ deviceId });
          const response = await api.post(`/sync/push${query ? '?' + query : ''}`, { operations });

          if (response.success && (response.data as any)?.results) {
            const results = (response.data as any).results as Array<{ clientTxnId: string; status: string; error?: string }>;

            for (const result of results) {
              if (result.status === 'synced') {
                await removeFromOutbox(result.clientTxnId);
              } else if (result.status === 'failed') {
                const all = await getOutbox();
                const item = all.find((t) => t.clientTxnId === result.clientTxnId);
                if (item) {
                  await addToOutbox({
                    ...item,
                    status: 'failed',
                    lastError: result.error || 'Gagal',
                    attempts: (item.attempts || 0) + 1,
                  });
                }
              }
            }

            const count = await getOutboxCount();
            set({
              lastSyncAt: Date.now(),
              syncStatus: 'idle',
              pendingCount: count,
            });

            await get().pull().catch(() => undefined);
          } else {
            throw new Error(response.error?.message || 'Sync failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sinkronisasi gagal';
          const count = await getOutboxCount();
          set({ syncStatus: 'error', syncError: message, pendingCount: count });
        }
      },

      pull: async () => {
        let { isOnline, deviceId } = get();
        if (!deviceId) {
          deviceId = ensureDeviceId();
          set({ deviceId });
        }
        if (!isOnline || !deviceId) return;

        try {
          const lastPulledAt = (await getMeta('lastPulledAt')) as string | undefined;
          const since = lastPulledAt || new Date(0).toISOString();

          // Build multi-value entities
          const queryParts: string[] = [];
          queryParts.push(`deviceId=${encodeURIComponent(deviceId)}`);
          queryParts.push(`since=${encodeURIComponent(since)}`);
          ['products', 'categories', 'customers', 'transactions'].forEach((e) => {
            queryParts.push(`entities=${encodeURIComponent(e)}`);
          });
          const query = queryParts.join('&');

          const response = await api.get(`/sync/pull?${query}`);

          if (response.success && response.data) {
            const data: any = response.data;

            if (Array.isArray(data.products)) {
              await cacheProducts(data.products);
            }
            if (Array.isArray(data.categories)) {
              await cacheCategories(data.categories);
            }
            if (Array.isArray(data.customers)) {
              await cacheCustomers(data.customers);
            }

            await setMeta('lastPulledAt', new Date().toISOString());

            if (Array.isArray(data.transactions) && data.transactions.length) {
              console.log(`Pulled ${data.transactions.length} transaction updates`);
            }
          }
        } catch (error) {
          console.error('Pull failed:', error);
        }
      },

      loadPendingFromStorage: async () => {
        const count = await getOutboxCount();
        set({ pendingCount: count });
      },
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        deviceId: state.deviceId,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

// Initialize device ID
export const initSync = async () => {
  let { deviceId } = useSyncStore.getState();
  if (!deviceId) {
    deviceId = ensureDeviceId();
    useSyncStore.setState({ deviceId });
  }
  await useSyncStore.getState().loadPendingFromStorage();

  // Initial pull if online
  if (navigator.onLine) {
    useSyncStore.getState().pull().catch(() => undefined);
  }

  // Listen for online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      const s = useSyncStore.getState();
      s.setOnlineStatus(true);
      s.sync().catch(() => undefined);
    });
    window.addEventListener('offline', () => useSyncStore.getState().setOnlineStatus(false));
  }
};