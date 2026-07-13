import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
          className="fixed bottom-4 right-[68px] z-50 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg transition duration-300 hover:scale-105 hover:shadow-indigo-500/30"
          title="AI School Assistant"
        >
          <Sparkles className="h-5 w-5" />
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
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-canvas sm:max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <div>
                  <h3 className="font-semibold leading-tight text-sm sm:text-base">MRLC AI Assistant</h3>
                  <p className="text-[10px] opacity-80">Context-aware · knows your classes, exams &amp; activity (read-only)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMessages([])}
                  className="rounded-lg p-1 hover:bg-white/10"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center space-y-4 px-2 py-8 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-50 dark:bg-slate-900">
                    <Sparkles className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm sm:text-base">How can I help you today?</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      I can see your classes, exams, grading queue and recent activity (read-only). Ask about what's happening, or pick a prompt below.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                    {QUICK_PROMPTS.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(qp.prompt);
                        }}
                        className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                      >
                        {qp.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm ${
                        m.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <MiniMarkdown
                          content={m.content}
                          className="break-words leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h3]:font-semibold [&_h3]:mt-1.5 [&_strong]:font-semibold [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400 [&_code]:rounded [&_code]:bg-slate-200/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] dark:[&_code]:bg-slate-800 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 dark:[&_th]:border-slate-700 dark:[&_th]:bg-slate-800 dark:[&_td]:border-slate-700 [&_hr]:my-2 [&_hr]:border-slate-200"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                      )}

                      {/* Copy Action for AI Responses */}
                      {m.role === "assistant" && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handleCopy(m.content, m.id)}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
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
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                    </span>
                    Generating assistance...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-100 p-3 dark:border-slate-800">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Aware of this page · read-only
                </span>
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your classes, exams, grading… (Shift+Enter for a new line)"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none max-h-32 min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 dark:border-slate-800 dark:bg-canvas dark:text-slate-100"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
