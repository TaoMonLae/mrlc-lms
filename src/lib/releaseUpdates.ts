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

const RELEASE_FREE_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/unauthorized',
  '/verify',
  '/dictionary',
  '/language-quest',
];

export function canAutoShowReleaseUpdates(pathname: string) {
  if (pathname === '/' || pathname.includes('/print')) return false;
  return !RELEASE_FREE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
