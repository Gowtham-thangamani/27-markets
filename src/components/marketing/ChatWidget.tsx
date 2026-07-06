import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm the 27 Markets assistant. Ask me about accounts, funding, platforms, or getting started.",
}

const QUICK_REPLIES = [
  'How do I open an account?',
  'What is the minimum deposit?',
  'How do withdrawals work?',
  'Is my money safe?',
]

/**
 * AI support chat widget. Talks to the public /support-chat endpoint (Claude).
 * If the backend has no API key it replies with a graceful fallback, so the
 * widget degrades safely rather than erroring.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const next = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      // Send only the real conversation (drop the canned greeting).
      const history = next.filter((m) => m !== GREETING)
      const res = await api.post<{ reply: string }>('/support-chat', { messages: history })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            'Sorry — I could not reach the assistant just now. Please try again, or contact our team via the Contact page.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Chat with the 27 Markets assistant'}
        aria-expanded={open}
        className="group fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-brand-500 py-3 pl-3 pr-4 text-sm font-semibold text-white shadow-[0_10px_30px_-6px_rgba(225,29,46,0.6)] transition-all hover:-translate-y-0.5 hover:bg-brand-600 lg:bottom-6"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Chat with us'}</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-label="27 Markets support assistant"
            className="fixed bottom-40 right-4 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl lg:bottom-24"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_0_16px_rgba(225,29,46,0.5)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">27 Markets Assistant</div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-sm bg-brand-500 text-white'
                        : 'rounded-bl-sm bg-white/[0.06] text-gray-100'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white/[0.06] px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick replies (only before the first user message) */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-3 py-1.5 text-xs font-medium text-brand-200 transition-colors hover:bg-brand-500/[0.16]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Ask a question…"
                  className="max-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void send(input)}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 px-1 text-center text-[10px] leading-tight text-gray-500">
                AI assistant — may be inaccurate. Not investment advice. Trading involves risk.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
