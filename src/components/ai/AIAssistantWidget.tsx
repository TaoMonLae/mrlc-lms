import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router";
import { Sparkles, X, Send, Copy, Check, Trash2 } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { apiSend } from "../../lib/api";
import { useFloatingPanel } from "../../providers/FloatingPanelProvider";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import MiniMarkdown from "./MiniMarkdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "📋 What needs my attention?", prompt: "Give me a quick summary of what needs my attention right now — pending grading, exams closing soon, and anything notable." },
  { label: "📊 Exam results", prompt: "Summarize the results of my most recent exam — average, pass rate, and how many are still awaiting grading." },
  { label: "🔎 Look up a student", prompt: "Look up this student and summarize how they're doing: " },
  { label: "📝 Lesson Plan", prompt: "Draft a detailed lesson plan for teaching a high school class about " },
  { label: "🔄 Translate to Mon/Burmese", prompt: "Translate the following text into Mon and Burmese: " },
];

export default function AIAssistantWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "there";
  // Coordinated with the Chat widget so only one floating panel is ever
  // expanded at a time -- both anchor to the bottom-right corner.
  const { isOpen: open, isOtherOpen: chatOpen, setOpen } = useFloatingPanel('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restrict to Admins and Teachers
  if (user?.role !== "ADMIN" && user?.role !== "TEACHER") return null;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  async function handleSend(textToSend = input) {
    const prompt = textToSend.trim();
    if (!prompt) return;

    const userMessage: Message = { id: Math.random().toString(), role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send recent conversation for memory, and the current page so the
      // assistant knows what the user is looking at. The backend builds the
      // system prompt + role-scoped situation snapshot.
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const response = await apiSend<{ reply: string }>("/api/ai/chat", "POST", {
        prompt,
        messages: history,
        pageContext: { path: location.pathname, title: typeof document !== "undefined" ? document.title : "" },
      });

      const assistantMessage: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: response.reply
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI response");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(content: string, msgId: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <>
      {/* Floating Sparkle Button -- hidden while our own panel or the Chat
          widget's panel is open, since both anchor to the same corner. */}
      {!open && !chatOpen && (
        <button
          onClick={() => setOpen(true)}
          className="group fixed bottom-4 right-[68px] z-50 grid size-11 place-items-center rounded-sm border border-academic-navy-deep bg-academic-gold text-academic-navy-deep transition-colors duration-150 hover:bg-academic-coral"
          title="AI School Assistant"
        >
          <Sparkles className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
        </button>
      )}

      {/* Side Assistant Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card dark:bg-background sm:max-w-[420px]"
          >
            {/* Top accent bar (app aubergine → pink) */}
            <div className="h-1 w-full shrink-0 bg-academic-gold" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-sm bg-academic-gold text-academic-navy-deep">
                  <Sparkles className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">AI Assistant</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Context-aware · read-only
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    title="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center space-y-5 px-1 py-6">
                  <div className="text-center">
                    <div className="mx-auto grid size-14 place-items-center rounded-sm bg-academic-gold text-academic-navy-deep">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Hi {firstName} 👋</h4>
                    <p className="mx-auto mt-1 max-w-[19rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      I can see your classes, exams, grading queue, attendance and recent activity — all read-only. Ask me anything, or start here:
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-left">
                    {QUICK_PROMPTS.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(qp.prompt)}
                        className="group flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left text-xs font-medium text-slate-700 transition-colors hover:border-aubergine-200 hover:bg-aubergine-50 hover:text-aubergine-900 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-aubergine-900/50 dark:hover:bg-aubergine-900/20"
                      >
                        <span className="flex-1">{qp.label}</span>
                        <Send className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-aubergine-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm bg-academic-gold text-academic-navy-deep">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`relative max-w-[82%] px-3.5 py-2.5 text-xs sm:text-sm ${
                        m.role === "user"
                          ? "rounded-2xl rounded-br-md bg-aubergine-600 text-white"
                          : "rounded-2xl rounded-tl-md bg-aubergine-50 text-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <MiniMarkdown
                          content={m.content}
                          className="break-words leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h3]:font-semibold [&_h3]:mt-1.5 [&_strong]:font-semibold [&_a]:text-aubergine-700 [&_a]:underline dark:[&_a]:text-aubergine-300 [&_code]:rounded [&_code]:bg-aubergine-100/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] dark:[&_code]:bg-slate-900 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-aubergine-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-white/60 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 dark:[&_th]:border-slate-700 dark:[&_th]:bg-slate-800 dark:[&_td]:border-slate-700 [&_hr]:my-2 [&_hr]:border-slate-200"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                      )}

                      {/* Copy Action for AI Responses */}
                      {m.role === "assistant" && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handleCopy(m.content, m.id)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-aubergine-600 dark:text-slate-500 dark:hover:text-aubergine-300"
                          >
                            {copiedId === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copiedId === m.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm bg-academic-gold text-academic-navy-deep">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-aubergine-50 px-3.5 py-2.5 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-aubergine-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-aubergine-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-aubergine-400 animate-bounce" />
                    </span>
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-end gap-2 rounded-sm border border-input bg-card p-1.5 pl-3 transition-colors focus-within:border-academic-teal focus-within:ring-2 focus-within:ring-academic-teal/25 dark:bg-background">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your classes, exams, grading…"
                  rows={1}
                  disabled={loading}
                  className="max-h-32 min-h-[28px] flex-1 resize-none border-0 bg-transparent py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50 dark:text-slate-100"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="h-8 w-8 shrink-0 rounded-xl bg-aubergine-600 text-white hover:bg-aubergine-700 disabled:opacity-40"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1.5 px-1 text-center text-[10px] text-slate-400">
                Read-only · sees your classes, exams &amp; activity · <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-800">Shift+Enter</kbd> for a new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
