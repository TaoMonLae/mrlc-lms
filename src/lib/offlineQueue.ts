import { authHeaders } from './api';

type QueuedMutation = {
  id: string;
  ownerId: string;
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  createdAt: string;
};
type MutationRequest = Omit<QueuedMutation, 'id' | 'ownerId' | 'createdAt'>;
const KEY = 'mrlc_offline_mutations_v1';

function currentOwnerId(): string | null {
  try {
    const cachedUser = JSON.parse(sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user') || '{}');
    return typeof cachedUser?.id === 'string' ? cachedUser.id : null;
  } catch {
    return null;
  }
}

function readQueue(): QueuedMutation[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function writeQueue(queue: QueuedMutation[]) {
  localStorage.setItem(KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('offline-queue-change', { detail: { count: offlineQueueCount() } }));
}
export function offlineQueueCount() {
  const ownerId = currentOwnerId();
  return ownerId ? readQueue().filter((item) => item.ownerId === ownerId).length : 0;
}

async function request(item: MutationRequest) {
  return fetch(item.path, {
    method: item.method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: item.body === undefined ? undefined : JSON.stringify(item.body),
  });
}

export async function sendOrQueueMutation<T = any>(item: MutationRequest): Promise<{ queued: boolean; data?: T }> {
  if (navigator.onLine) {
    try {
      const response = await request(item);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${response.status})`);
      }
      const text = await response.text();
      return { queued: false, data: text ? JSON.parse(text) : undefined };
    } catch (error) {
      // Browser online state is optimistic; a TypeError still means the
      // request never reached the server and is safe to queue for retry.
      if (!(error instanceof TypeError)) throw error;
    }
  }
  const ownerId = currentOwnerId();
  if (!ownerId) throw new Error('Sign in before saving changes offline.');
  const queued = readQueue();
  queued.push({ ...item, ownerId, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  writeQueue(queued);
  return { queued: true };
}

export async function flushOfflineQueue() {
  if (!navigator.onLine) return;
  const queue = readQueue();
  const ownerId = currentOwnerId();
  if (!ownerId) return;
  const remaining: QueuedMutation[] = [];
  for (const item of queue) {
    // A shared device may contain pending work from several accounts. Never
    // submit one person's attendance while another person is signed in.
    if (item.ownerId !== ownerId) {
      remaining.push(item);
      continue;
    }
    try {
      const response = await request(item);
      if (!response.ok && response.status >= 500) remaining.push(item);
      // 4xx means the saved request is no longer valid; discard instead of retrying forever.
    } catch { remaining.push(item); }
  }
  writeQueue(remaining);
}

export function startOfflineSync() {
  window.addEventListener('online', () => void flushOfflineQueue());
  window.addEventListener('load', () => void flushOfflineQueue());
}
