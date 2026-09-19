import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

/** Keep failed loads distinct from valid empty lists, and discard stale responses. */
export function useApiList<T>(url: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    apiGet<unknown>(url, { signal: controller.signal }).then(result => {
      if (!Array.isArray(result)) throw new Error('The server returned an invalid list. Please retry.');
      if (!controller.signal.aborted) setData(result);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.message || 'Unable to load records. Please retry.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, revision]);
  return { data, setData, loading, error, reload: () => setRevision(value => value + 1) };
}
