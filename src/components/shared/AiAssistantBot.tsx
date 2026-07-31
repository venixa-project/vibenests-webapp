import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { chatAnswer } from "@/lib/llm";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send } from "lucide-react";
import { Link } from "react-router-dom";

type ChatRole = "user" | "assistant";

type ChatMsg = {
  id: string;
  role: ChatRole;
  text: string;
};

// Simple Markdown Parser for Links and Bold Text
function formatMessage(text: string) {
  // Split by links [Text](URL)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];
    
    parts.push(
      <Link key={match.index} to={url} className="text-gold underline hover:text-white transition-colors">
        {label}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Parse bold **text** in string parts
  return parts.map((part, i) => {
    if (typeof part === 'string') {
      const boldParts = part.split(/\*\*([^*]+)\*\*/g);
      return (
        <span key={i}>
          {boldParts.map((bp, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-white">{bp}</strong> : <span key={j}>{bp}</span>)}
        </span>
      );
    }
    return part;
  });
}

export default function AiAssistantBot() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Position & Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
    }
    setPosition({
      x: initialPos.current.x + dx,
      y: initialPos.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setOpen(true);
  };
  
  // Track history for backend
  const chatHistory = messages.map(m => ({ role: m.role, content: m.text }));

  useEffect(() => {
    if (!open) return;
    setMessages((prev) => {
      if (prev.length) return prev;
      return [
        { id: crypto.randomUUID(), role: "assistant", text: "Hi there! I'm your VibeNests Assistant. How can I help you today?" },
      ];
    });
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const currentHistory = chatHistory.length > 5 ? chatHistory.slice(-5) : chatHistory; 
      const replyText = await chatAnswer(text, currentHistory);
      const botMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: replyText,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      const errText = e.message && e.message !== 'Chat failed' ? e.message : "Sorry, I’m having trouble connecting right now. Please try again.";
      const botMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: errText,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      className="fixed bottom-6 right-6 z-[9999] touch-none select-none transition-transform duration-75"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-[360px] max-w-[90vw] mb-4 rounded-3xl glass-card border border-white/10 shadow-2xl overflow-hidden flex flex-col cursor-grab active:cursor-grabbing"
            role="dialog"
            aria-label="VibeNests Assistant chat"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3 pointer-events-none">
                <div className="h-10 w-10 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/bot-avatar.png" alt="Assistant Avatar" className="h-full w-full object-cover" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">VibeNests Assistant</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online (Drag to move)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors pointer-events-auto"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="p-4 bg-gradient-to-b from-transparent to-black/20 select-text">
              <div ref={listRef} className="h-[320px] max-h-[50vh] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((m) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                       <div className="h-6 w-6 rounded-full shrink-0 overflow-hidden border border-gold/30 mr-2 mt-auto mb-1 bg-black/20">
                          <img src="/bot-avatar.png" alt="Bot" className="h-full w-full object-cover" />
                       </div>
                    )}
                    <div className="max-w-[80%]">
                      <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                            m.role === "user"
                              ? "bg-gold text-[oklch(0.12_0.02_260)] rounded-br-sm"
                              : "glass border border-white/10 text-foreground rounded-bl-sm"
                          }`}
                      >
                        <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                          {m.role === "user" ? m.text : formatMessage(m.text)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                     <div className="h-6 w-6 rounded-full shrink-0 overflow-hidden border border-gold/30 mr-2 mt-auto mb-1 bg-black/20">
                        <img src="/bot-avatar.png" alt="Bot" className="h-full w-full object-cover" />
                     </div>
                    <div className="glass border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-black/20 flex gap-2 items-end select-text cursor-default">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Ask something..."
                className="luxury-input flex-1 rounded-2xl px-4 py-2.5 text-[13px] bg-black/40 resize-none max-h-24 min-h-[44px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onSend}
                disabled={loading || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-2xl bg-gold text-[oklch(0.12_0.02_260)] flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Send"
              >
                <Send className="h-5 w-5 ml-1" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleAvatarClick}
          className="relative flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 cursor-grab active:cursor-grabbing"
        >
          <div className="glass-card rounded-2xl rounded-br-sm px-4 py-3 shadow-lg border border-gold/20 mr-2 max-w-[200px] pointer-events-none">
            <p className="text-[13px] text-foreground leading-snug">
              Hey hii! How can I assist you today?
            </p>
          </div>
          <button
            type="button"
            className="h-16 w-16 rounded-full bg-gold flex items-center justify-center shadow-[0_0_30px_rgba(212,160,60,0.4)] border border-gold/40 hover:opacity-95 transition-all p-1 z-10 pointer-events-none"
            aria-label="Open AI Assistant"
          >
            <div className="h-full w-full rounded-full overflow-hidden border border-[oklch(0.12_0.02_260)]/20 bg-black/20">
              <img src="/bot-avatar.png" alt="Assistant" className="h-full w-full object-cover" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
