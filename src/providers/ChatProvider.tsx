import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiGet } from '../lib/api';

interface ConvSummary {
  id: string; title: string; unread: number; lastMessageAt: string;
  lastMessage: { body: string } | null;
}

interface ChatCtx {
  conversations: ConvSummary[];
  unreadCount: number;
  onlineUserIds: Set<string>;
  eventTick: number;            // bumps on each live event so views can refetch
  isOnline: (userId: string) => boolean;
  setActiveConversation: (id: string | null) => void;
  refresh: () => void;
}

const Ctx = createContext<ChatCtx | null>(null);

const LIST_MS = 8000;
const PRESENCE_MS = 15000;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [eventTick, setEventTick] = useState(0);
  const activeRef = useRef<string | null>(null);
  const prevUnreadRef = useRef<Record<string, number>>({});
  const firstLoadRef = useRef(true);

  const unreadCount = conversations.reduce((n, c) => n + (c.unread || 0), 0);

  async function loadList() {
    try {
      const list = await apiGet<ConvSummary[]>('/api/chat/conversations');
      if (!Array.isArray(list)) return;
      // Toast on conversations whose unread increased (except the open one).
      if (!firstLoadRef.current) {
        for (const c of list) {
          const prev = prevUnreadRef.current[c.id] ?? 0;
          if (c.unread > prev && c.id !== activeRef.current) {
            toast.message(`New message · ${c.title}`, { description: c.lastMessage?.body?.slice(0, 80) });
          }
        }
      }
      firstLoadRef.current = false;
      prevUnreadRef.current = Object.fromEntries(list.map((c) => [c.id, c.unread]));
      setConversations(list);
    } catch { /* keep prior */ }
  }

  async function loadPresence() {
    try {
      const data = await apiGet<{ online: string[] }>('/api/chat/presence');
      setOnlineUserIds(new Set(data?.online ?? []));
    } catch { /* keep prior */ }
  }

  useEffect(() => {
    loadList(); loadPresence();
    const t1 = setInterval(loadList, LIST_MS);
    const t2 = setInterval(loadPresence, PRESENCE_MS);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  // One app-wide SSE connection: bumps eventTick + refreshes the list/presence.
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (!token || typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/chat/stream?token=${encodeURIComponent(token)}`);
      es.onmessage = () => { setEventTick((t) => t + 1); loadList(); };
      es.onopen = () => loadPresence();
    } catch { /* ignore */ }
    return () => es?.close();
  }, []);

  const value: ChatCtx = {
    conversations,
    unreadCount,
    onlineUserIds,
    eventTick,
    isOnline: (id: string) => onlineUserIds.has(id),
    setActiveConversation: (id) => { activeRef.current = id; },
    refresh: () => { loadList(); loadPresence(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat(): ChatCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op default if used outside the provider.
    return {
      conversations: [], unreadCount: 0, onlineUserIds: new Set(), eventTick: 0,
      isOnline: () => false, setActiveConversation: () => {}, refresh: () => {},
    };
  }
  return ctx;
}
