import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Copy, Check, Trash2 } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { apiSend } from "../../lib/api";
import { useFloatingPanel } from "../../providers/FloatingPanelProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "📝 Lesson Plan", prompt: "Draft a detailed lesson plan for teaching a high school class about " },
  { label: "❓ Quiz Generator", prompt: "Generate 5 multiple-choice questions with answers on the topic of " },
  { label: "📢 Announcement", prompt: "Draft a warm school announcement notifying parents about " },
  { label: "🔄 Translate to Mon/Burmese", prompt: "Translate the following text into Mon and Burmese: " }
];

export default function AIAssistantWidget() {
  const { user } = useAuth();
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
      const response = await apiSend<{ reply: string }>("/api/ai/chat", "POST", {
        prompt,
        systemInstruction: "You are an AI assistant built specifically for the Mon Refugee Learning Centre (MRLC) Learning Management System. Your goal is to help teachers and school administrators draft lesson plans, generate examination/quiz questions, translate announcements into local languages (English, Burmese, Mon), write student case notes, and assist with general administrative duties. Always output clear, helpful, and formatted answers in markdown where applicable."
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
                  <p className="text-[10px] opacity-80">Free Gemma/Gemini integration for Teachers & Admins</p>
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
                      Choose a quick prompt below or type your request in the chat.
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
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                      
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
            <div className="border-t border-slate-100 p-3 dark:border-slate-800 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask AI assistant..."
                className="text-xs sm:text-sm h-10 flex-1"
                disabled={loading}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
