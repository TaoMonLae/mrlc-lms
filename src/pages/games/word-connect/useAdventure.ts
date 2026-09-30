import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyProgress, normaliseProgress, type AdventureProgress } from './engine';
import { useAuth } from '../../../providers/AuthProvider';

export const progressKey = (userId: string) => `mrlc:word-connect:v1:${userId}`;
function load(key: string) {
  try { return normaliseProgress(JSON.parse(localStorage.getItem(key) || 'null')); }
  catch { return emptyProgress(); }
}

export function useAdventure() {
  const { user } = useAuth();
  const key = progressKey(user?.id || 'guest');
  const [stored, setStored] = useState(() => ({ key, progress: load(key) }));
  const currentRef = useRef(stored);
  currentRef.current = stored;
  const [saveError, setSaveError] = useState(false);
  const progress = stored.key === key ? stored.progress : load(key);
  useEffect(() => { setStored({ key, progress: load(key) }); setSaveError(false); }, [key]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key) setStored({ key, progress: load(key) }); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  const update = useCallback((change: (current: AdventureProgress) => AdventureProgress) => {
    const current = currentRef.current;
    const base = current.key === key ? current.progress : load(key);
    const next = change(base);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaveError(false); }
    catch { setSaveError(true); }
    currentRef.current = { key, progress: next };
    setStored(currentRef.current);
  }, [key]);
  return { progress, update, saveError };
}
