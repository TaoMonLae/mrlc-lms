import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../lib/api';

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
  typingNames: (conversationId: string) => string[];  // who's currently typing there
  sendTyping: (conversationId: string) => void;        // signal that I'm typing (throttled)
}

const Ctx = createContext<ChatCtx | null>(null);

const LIST_MS = 8000;
const PRESENCE_MS = 15000;
const TYPING_TTL_MS = 5000;      // hide the indicator this long after the last keystroke event
const TYPING_SEND_MS = 2500;     // don't re-ping the server more often than this

type TypingMap = Record<string, Record<string, { name: string; at: number }>>;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [eventTick, setEventTick] = useState(0);
  const [typing, setTyping] = useState<TypingMap>({});
  const activeRef = useRef<string | null>(null);
  const prevUnreadRef = useRef<Record<string, number>>({});
  const firstLoadRef = useRef(true);
  const lastTypingSentRef = useRef<Record<string, number>>({});

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

    // Set an httpOnly cookie by making a request to a special endpoint
    const setupCookie = async () => {
      try {
        await fetch('/api/set-chat-cookie', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to set chat cookie:', error);
      }
    };

    setupCookie();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/chat/stream');
      es.onmessage = (e) => {
        let payload: any = null;
        try { payload = JSON.parse(e.data); } catch { /* non-JSON keep-alive */ }

        // Typing pings are high-frequency and must NOT trigger a list refetch.
        if (payload?.type === 'typing' && payload.conversationId && payload.userId) {
          setTyping((prev) => ({
            ...prev,
            [payload.conversationId]: {
              ...(prev[payload.conversationId] || {}),
              [payload.userId]: { name: payload.name || 'Someone', at: Date.now() },
            },
          }));
          return;
        }

        // A delivered message means the sender stopped typing — clear it for that convo.
        if (payload?.type === 'message' && payload.conversationId) {
          setTyping((prev) => {
            if (!prev[payload.conversationId]) return prev;
            const next = { ...prev };
            delete next[payload.conversationId];
            return next;
          });
        }

        setEventTick((t) => t + 1);
        loadList();
      };
      es.onopen = () => loadPresence();
    } catch { /* ignore */ }
    return () => es?.close();
  }, []);

  // Prune stale typing entries so the indicator disappears when someone stops.
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        let changed = false;
        const next: TypingMap = {};
        for (const [cid, users] of Object.entries(prev)) {
          const keep: Record<string, { name: string; at: number }> = {};
          for (const [uid, info] of Object.entries(users)) {
            if (now - info.at < TYPING_TTL_MS) keep[uid] = info;
            else changed = true;
          }
          if (Object.keys(keep).length) next[cid] = keep;
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const value: ChatCtx = {
    conversations,
    unreadCount,
    onlineUserIds,
    eventTick,
    isOnline: (id: string) => onlineUserIds.has(id),
    setActiveConversation: (id) => { activeRef.current = id; },
    refresh: () => { loadList(); loadPresence(); },
    typingNames: (conversationId: string) => {
      const users = typing[conversationId];
      if (!users) return [];
      const now = Date.now();
      return Object.values(users).filter((u) => now - u.at < TYPING_TTL_MS).map((u) => u.name);
    },
    sendTyping: (conversationId: string) => {
      const now = Date.now();
      if (now - (lastTypingSentRef.current[conversationId] || 0) < TYPING_SEND_MS) return;
      lastTypingSentRef.current[conversationId] = now;
      apiSend(`/api/chat/conversations/${conversationId}/typing`, 'POST', {}).catch(() => {});
    },
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
      typingNames: () => [], sendTyping: () => {},
    };
  }
  return ctx;
}
