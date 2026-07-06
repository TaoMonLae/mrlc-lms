import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { apiGet, apiSend } from '../lib/api';

interface SocialCtx {
  unreadCount: number;
  /** Call when the user actually views the feed, to clear the badge. */
  markSeen: () => void;
}

const Ctx = createContext<SocialCtx | null>(null);

const POLL_MS = 20000;

/**
 * Tracks unseen Social Space activity (new posts/comments from other people)
 * app-wide, the same way ChatProvider tracks unread chat messages -- so a
 * badge can show on the sidebar nav item even when the user isn't on the
 * /social page.
 */
export function SocialProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const suppressedRef = useRef(false);

  async function loadCount() {
    if (suppressedRef.current) return;
    try {
      const data = await apiGet<{ unread: number }>('/api/social/unread-count');
      setUnreadCount(data?.unread ?? 0);
    } catch { /* keep prior */ }
  }

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, POLL_MS);
    return () => clearInterval(t);
  }, []);

  async function markSeen() {
    // Zero the badge immediately for responsiveness, then confirm with the
    // server; briefly suppress the next poll so a slow response can't race
    // it back to a stale non-zero value.
    setUnreadCount(0);
    suppressedRef.current = true;
    try { await apiSend('/api/social/seen', 'POST', {}); } catch { /* ignore */ }
    suppressedRef.current = false;
    loadCount();
  }

  return <Ctx.Provider value={{ unreadCount, markSeen }}>{children}</Ctx.Provider>;
}

export function useSocial(): SocialCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op default if used outside the provider.
    return { unreadCount: 0, markSeen: () => {} };
  }
  return ctx;
}
