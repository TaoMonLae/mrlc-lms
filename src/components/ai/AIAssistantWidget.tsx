import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Dialog } from '@base-ui/react/dialog';
import { Sparkles, X, ArrowUp, ArrowUpRight, ArrowRight, Copy, Check, Plus, Maximize2, Minimize2, Square, RotateCcw, ClipboardList, ChartNoAxesCombined, UserRoundSearch, BookOpen, Languages, ShieldCheck, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { apiSend } from '../../lib/api';
import { useFloatingPanel } from '../../providers/FloatingPanelProvider';
import { toast } from 'sonner';
import MiniMarkdown from './MiniMarkdown';
import './ai-assistant.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'pending' | 'complete' | 'failed' | 'stopped';
}
type Recovery = { id: string; prompt: string; message: string; stopped?: boolean };
const ATTENTION_PROMPT = 'Give me a quick summary of what needs my attention right now — pending grading, exams closing soon, and anything notable.';
const QUICK_PROMPTS = [
  { label: 'Review exam results', description: 'See progress and grading', icon: ChartNoAxesCombined, prompt: 'Summarize the results of my most recent exam — average, pass rate, and how many are still awaiting grading.' },
  { label: 'Look up a student', description: 'Understand their progress', icon: UserRoundSearch, prompt: "Look up this student and summarize how they're doing: " },
  { label: 'Plan a lesson', description: 'Turn a topic into a plan', icon: BookOpen, prompt: 'Draft a detailed lesson plan for teaching a high school class about ' },
  { label: 'Translate a text', description: 'English, Mon or Burmese', icon: Languages, prompt: 'Translate the following text into Mon and Burmese: ' },
];

// Key the conversation to its owner; switching accounts must never retain school data.
export default function AIAssistantWidget() {
  const { user } = useAuth();
  if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) return null;
  return <AssistantPanel key={user.id} firstName={user.name?.trim().split(/\s+/)[0] || 'there'} />;
}

function AssistantPanel({ firstName }: { firstName: string }) {
  const location = useLocation();
  const { isOpen: open, isOtherOpen: chatOpen, setOpen } = useFloatingPanel('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => setMobile(query.matches);
    update(); query.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); requestRef.current?.abort(); if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);
  useEffect(() => {
    const field = inputRef.current;
    if (field) { field.style.height = 'auto'; field.style.height = `${Math.min(field.scrollHeight, 160)}px`; }
  }, [input, open, expanded]);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'auto' });
  }, [messages, loading, recovery, open]);

  function choosePrompt(prompt: string) {
    setInput(prompt);
    inputRef.current?.focus();
  }
  function newConversation() {
    requestRef.current?.abort(); requestRef.current = null;
    setMessages([]); setInput(''); setRecovery(null); setLoading(false);
    inputRef.current?.focus();
  }
  function stopResponse() {
    requestRef.current?.abort(); requestRef.current = null;
    setLoading(false);
    const last = [...messages].reverse().find((message) => message.role === 'user' && message.status === 'pending');
    if (last) {
      setMessages((rows) => rows.map((row) => row.id === last.id ? { ...row, status: 'stopped' } : row));
      setRecovery({ id: last.id, prompt: last.content, message: 'Response stopped. You can try again when you’re ready.', stopped: true });
    }
  }
  async function handleSend(text = input, retryId?: string) {
    const prompt = text.trim();
    if (!prompt || requestRef.current) return;
    const controller = new AbortController(); requestRef.current = controller;
    const id = retryId || crypto.randomUUID();
    const history = messages.filter((message) => message.id !== retryId && (!message.status || message.status === 'complete')).slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((rows) => retryId ? rows.map((row) => row.id === retryId ? { ...row, status: 'pending' } : row) : [...rows, { id, role: 'user', content: prompt, status: 'pending' }]);
    if (!retryId) setInput('');
    setRecovery(null); setLoading(true);
    try {
      const response = await apiSend<{ reply: string }>('/api/ai/chat', 'POST', {
        prompt, messages: history, pageContext: { path: location.pathname, title: document.title },
      }, { signal: controller.signal });
      if (requestRef.current !== controller) return;
      if (!response.reply?.trim()) throw new Error('The assistant returned an empty response. Please try again.');
      setMessages((rows) => [...rows.map((row) => row.id === id ? { ...row, status: 'complete' as const } : row), { id: crypto.randomUUID(), role: 'assistant', content: response.reply }]);
    } catch (error: any) {
      if (requestRef.current !== controller || controller.signal.aborted) return;
      setMessages((rows) => rows.map((row) => row.id === id ? { ...row, status: 'failed' } : row));
      setRecovery({ id, prompt, message: error?.message || 'Could not connect to the assistant. Please try again.' });
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setLoading(false); }
    }
  }
  async function handleCopy(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Could not copy. Select the response text to copy it.'); }
  }

  return <Dialog.Root open={open} onOpenChange={setOpen} modal={mobile} disablePointerDismissal>
    <Dialog.Trigger ref={triggerRef} className="ai-launcher" hidden={open || chatOpen} aria-label="Open AI assistant" title="AI school assistant">
      <Sparkles size={20} aria-hidden="true" />
    </Dialog.Trigger>
    <Dialog.Portal>
      {mobile && <Dialog.Backdrop className="ai-backdrop" />}
      <Dialog.Popup className={`ai-panel${expanded ? ' ai-panel--expanded' : ''}`} initialFocus={mobile ? false : inputRef} finalFocus={triggerRef}>
        <header className="ai-panel__header">
          <div className="ai-panel__brand"><span className="ai-mark"><Sparkles size={19} aria-hidden="true" /></span><div><Dialog.Title className="ai-panel__title">AI Assistant</Dialog.Title><span className="ai-panel__subtitle">Your school workspace</span></div></div>
          <div className="ai-panel__tools">
            {messages.length > 0 && <button type="button" className="ai-icon-button" onClick={newConversation} aria-label="New conversation" title="New conversation"><Plus size={18} /></button>}
            <button type="button" className="ai-icon-button ai-expand" onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Narrow assistant' : 'Expand assistant'} title={expanded ? 'Narrow assistant' : 'Expand assistant'}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            <Dialog.Close className="ai-icon-button" aria-label="Close AI assistant" title="Close (Esc)"><X size={20} /></Dialog.Close>
          </div>
        </header>
        <Dialog.Description className="ai-panel__context"><ShieldCheck size={14} aria-hidden="true" /><span>School context, with view-only access</span></Dialog.Description>
        <div ref={scrollRef} className="ai-panel__scroll">
          {messages.length === 0 ? <div className="ai-welcome">
            <div className="ai-welcome__intro"><p className="ai-eyebrow">LET’S MAKE ROOM FOR TEACHING</p><h2>What can I help<br />with today?</h2><p>Hi {firstName}. Get a clearer picture of your classes, or a head start on your next lesson.</p></div>
            <button type="button" className="ai-featured" onClick={() => choosePrompt(ATTENTION_PROMPT)}>
              <span className="ai-featured__top"><ClipboardList size={20} aria-hidden="true" /><span>START WITH A QUICK CHECK-IN</span><ArrowUpRight size={19} aria-hidden="true" /></span>
              <strong>What needs my attention?</strong><span>Pending grading, upcoming exams and what’s next.</span>
            </button>
            <div className="ai-suggestions"><p className="ai-section-label">Or explore something specific</p><div className="ai-suggestions__grid">{QUICK_PROMPTS.map(({ label, description, icon: Icon, prompt }) => <button type="button" className="ai-suggestion" key={label} onClick={() => choosePrompt(prompt)}><span className="ai-suggestion__icons"><Icon size={19} aria-hidden="true" /><ArrowUpRight size={14} aria-hidden="true" /></span><strong>{label}</strong><span>{description}</span></button>)}</div></div>
            <p className="ai-welcome__hint">Choose a starting point, then make it your own.<ArrowRight size={14} aria-hidden="true" /></p>
          </div> : <div className="ai-conversation" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => <article key={message.id} className={`ai-message ai-message--${message.role}`} aria-label={message.role === 'user' ? 'Your message' : 'Assistant response'}>
              {message.role === 'user' ? <><p>{message.content}</p>{['failed', 'stopped'].includes(message.status || '') && <span className="ai-message__state">{message.status === 'failed' ? 'Not answered' : 'Stopped'}</span>}</> : <><div className="ai-message__author"><Sparkles size={15} aria-hidden="true" /><span>AI Assistant</span></div><MiniMarkdown content={message.content} className="ai-markdown" /><button type="button" className="ai-copy" onClick={() => void handleCopy(message)} aria-label={copiedId === message.id ? 'Response copied' : 'Copy response'}>{copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}{copiedId === message.id ? 'Copied' : 'Copy response'}</button></>}
            </article>)}
          </div>}
          {loading && <div className="ai-thinking" role="status"><LoaderCircle size={16} aria-hidden="true" /><span>Putting your answer together…</span></div>}
          {recovery && <div className={`ai-recovery${recovery.stopped ? ' ai-recovery--stopped' : ''}`} role={recovery.stopped ? 'status' : 'alert'}><strong>{recovery.stopped ? 'Paused here' : 'Something went wrong'}</strong><p>{recovery.message}</p><button type="button" onClick={() => void handleSend(recovery.prompt, recovery.id)}><RotateCcw size={14} aria-hidden="true" />Try again</button></div>}
        </div>
        <footer className="ai-panel__footer">
          <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); void handleSend(); }}>
            <label htmlFor="ai-message" className="sr-only">Message AI assistant</label>
            <textarea id="ai-message" ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSend(); } }} placeholder={messages.length ? 'Ask a follow-up…' : 'Ask about your school day…'} rows={2} maxLength={8000} />
            <div className="ai-composer__bottom"><span className="ai-composer__hint">{input.length > 7200 ? `${input.length.toLocaleString()} / 8,000` : <><kbd>Shift ↵</kbd> for a new line</>}</span>{loading ? <button type="button" className="ai-send" onClick={stopResponse} aria-label="Stop response" title="Stop response"><Square size={15} fill="currentColor" /></button> : <button type="submit" className="ai-send" disabled={!input.trim()} aria-label="Send message" title="Send message"><ArrowUp size={20} /></button>}</div>
          </form>
          <p className="ai-footer-note">AI can make mistakes. Check important details.</p>
        </footer>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
