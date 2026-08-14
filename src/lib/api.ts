import { localDB } from './db';

const BASE_URL = '/api';

export const api = {
  async get(endpoint: string, params?: Record<string, any>) {
    const url = new URL(`${window.location.origin}${BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Terjadi kesalahan jaringan');
    }
    return res.json();
  },

  async post(endpoint: string, data?: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Terjadi kesalahan pada server');
    }
    return res.json();
  },

  async put(endpoint: string, data?: any) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Terjadi kesalahan');
    }
    return res.json();
  },

  async delete(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Gagal menghapus data');
    }
    return res.json();
  },
};

// Offline Sync Manager
export async function syncOfflineQueueToServer(onProgress?: (pendingCount: number) => void): Promise<{ successCount: number; failCount: number }> {
  const pendingItems = await localDB.sync_queue.where('status').equals('pending').toArray();
  let successCount = 0;
  let failCount = 0;

  for (const item of pendingItems) {
    try {
      await localDB.sync_queue.update(item.id, { status: 'syncing' });

      if (item.action === 'create_order') {
        await api.post('/pos/orders', item.payload);
      } else if (item.action === 'create_transaction') {
        await api.post('/pos/transactions', item.payload);
      }

      await localDB.sync_queue.update(item.id, { status: 'synced' });
      successCount++;
    } catch (err: any) {
      console.error(`Sync error on ${item.id}:`, err);
      await localDB.sync_queue.update(item.id, {
        status: 'failed',
        error_message: err.message || 'Gagal tersambung ke server',
      });
      failCount++;
    }
  }

  const remaining = await localDB.sync_queue.where('status').equals('pending').count();
  if (onProgress) onProgress(remaining);

  return { successCount, failCount };
}
