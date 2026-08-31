const STORAGE_PREFIX = 'mrlc:release-seen';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function releaseStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function hasSeenRelease(storage: StorageLike, userId: string, releaseId: string) {
  try {
    return storage.getItem(releaseStorageKey(userId)) === releaseId;
  } catch {
    return false;
  }
}

export function markReleaseSeen(storage: StorageLike, userId: string, releaseId: string) {
  try {
    storage.setItem(releaseStorageKey(userId), releaseId);
    return true;
  } catch {
    return false;
  }
}
