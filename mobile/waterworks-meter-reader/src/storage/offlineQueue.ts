import * as SecureStore from 'expo-secure-store';

const QUEUE_KEY = 'ww_offline_readings_queue';

export type OfflineReading = {
  local_id: string;
  account_id: string;
  current_reading: number;
  notes?: string;
  period_month: number;
  period_year: number;
  reading_date: string;
  queued_at: string;
};

async function readQueue(): Promise<OfflineReading[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: OfflineReading[]) {
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items.slice(-100)));
}

export async function enqueueOfflineReading(item: Omit<OfflineReading, 'local_id' | 'queued_at'>) {
  const queue = await readQueue();
  const entry: OfflineReading = {
    ...item,
    local_id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queued_at: new Date().toISOString(),
  };
  queue.push(entry);
  await writeQueue(queue);
  return entry;
}

export async function listOfflineReadings() {
  return readQueue();
}

export async function removeOfflineReading(localId: string) {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.local_id !== localId));
}

/**
 * Flush queued readings to the API when online.
 */
export async function syncOfflineReadings(
  submitFn: (payload: {
    account_id: string;
    current_reading: number;
    notes?: string;
    period_month: number;
    period_year: number;
    reading_date: string;
  }) => Promise<unknown>
) {
  const queue = await readQueue();
  const remaining: OfflineReading[] = [];
  const synced: string[] = [];

  for (const item of queue) {
    try {
      await submitFn({
        account_id: item.account_id,
        current_reading: item.current_reading,
        notes: item.notes,
        period_month: item.period_month,
        period_year: item.period_year,
        reading_date: item.reading_date,
      });
      synced.push(item.local_id);
    } catch {
      remaining.push(item);
    }
  }

  await writeQueue(remaining);
  return { synced: synced.length, remaining: remaining.length };
}
