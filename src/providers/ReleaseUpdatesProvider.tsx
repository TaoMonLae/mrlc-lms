import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CURRENT_RELEASE } from '../data/releases';
import { hasSeenRelease, markReleaseSeen, releaseStorageKey } from '../lib/releaseUpdates';
import { useAuth } from './AuthProvider';
import { UpdateScreen } from '../components/updates/UpdateScreen';

type ReleaseUpdatesContextValue = {
  hasUnseenRelease: boolean;
  openUpdates: () => void;
};

const ReleaseUpdatesContext = createContext<ReleaseUpdatesContextValue>({
  hasUnseenRelease: false,
  openUpdates: () => {},
});

export function useReleaseUpdates() {
  return useContext(ReleaseUpdatesContext);
}

export function ReleaseUpdatesProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [hasUnseenRelease, setHasUnseenRelease] = useState(false);

  useEffect(() => {
    if (isLoading || !user) {
      setOpen(false);
      setHasUnseenRelease(false);
      return;
    }

    const unseen = !hasSeenRelease(localStorage, user.id, CURRENT_RELEASE.id);
    setHasUnseenRelease(unseen);
    if (!unseen) return;

    // Let the destination page settle first; the update remains the next
    // clear focus without competing with the login transition.
    const timer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [isLoading, user]);

  useEffect(() => {
    if (!user) return;
    const key = releaseStorageKey(user.id);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const unseen = event.newValue !== CURRENT_RELEASE.id;
      setHasUnseenRelease(unseen);
      if (!unseen) setOpen(false);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  const openUpdates = useCallback(() => setOpen(true), []);
  const closeUpdates = useCallback(() => {
    if (user) markReleaseSeen(localStorage, user.id, CURRENT_RELEASE.id);
    setHasUnseenRelease(false);
    setOpen(false);
  }, [user]);

  const value = useMemo(() => ({ hasUnseenRelease, openUpdates }), [hasUnseenRelease, openUpdates]);

  return (
    <ReleaseUpdatesContext.Provider value={value}>
      {children}
      {user && <UpdateScreen open={open} onClose={closeUpdates} release={CURRENT_RELEASE} />}
    </ReleaseUpdatesContext.Provider>
  );
}
