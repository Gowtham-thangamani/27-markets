import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, X, Sparkles, LifeBuoy, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { BOT_GREETING, BOT_TOPICS, type BotLink } from '@/mock/supportBot'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  links?: BotLink[]
}

const GREETING: Msg = { role: 'assistant', content: BOT_GREETING }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Rule-based support assistant. No AI / no external API cost: it answers from a
 * fixed set of topics (see src/mock/supportBot.ts) and can file a support
 * ticket, which is captured as a lead in the admin CRM (POST /leads).
 */
export function ChatWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [mode, setMode] = useState<'menu' | 'ticket'>('menu')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Ticket form
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, mode])

  const pickTopic = (id: string) => {
    const topic = BOT_TOPICS.find((t) => t.id === id)
    if (!topic) return
    setMessages((m) => [
      ...m,
      { role: 'user', content: topic.label },
      { role: 'assistant', content: topic.answer, links: topic.links },
    ])
  }

  const goto = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const submitTicket = async () => {
    setFormError(null)
    const name = form.name.trim()
    const email = form.email.trim()
    const message = form.message.trim()
    if (name.length < 2) return setFormError('Please enter your name.')
    if (!EMAIL_RE.test(email)) return setFormError('Please enter a valid email address.')
    if (message.length < 5) return setFormError('Please describe how we can help.')
    setSending(true)
    try {
      await api.post('/leads', {
        name,
        email,
        subject: form.subject.trim() || 'Support request',
        message,
        source: 'MANUAL',
      })
      setMode('menu')
      setForm({ name: '', email: '', subject: '', message: '' })
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Thanks, ${name.split(' ')[0]}! Your message has been sent to our support team. We'll reply to ${email} as soon as we can.`,
        },
      ])
    } catch (e) {
      setFormError(
        e instanceof ApiError ? e.message : 'Could not send just now — please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Chat with 27 Markets support'}
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
                <div className="text-sm font-semibold text-white">27 Markets Support</div>
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
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'space-y-2'}`}>
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-br-sm bg-brand-500 text-white'
                          : 'rounded-bl-sm bg-white/[0.06] text-gray-100'
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.links && m.links.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.links.map((l) => (
                          <button
                            key={l.to}
                            type="button"
                            onClick={() => goto(l.to)}
                            className="inline-flex items-center gap-1 rounded-full border border-brand-500/40 bg-brand-500/[0.1] px-3 py-1.5 text-xs font-semibold text-brand-200 transition-colors hover:bg-brand-500/[0.2]"
                          >
                            {l.label} <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action area */}
            <div className="border-t border-white/[0.08] bg-white/[0.02] p-3">
              {mode === 'ticket' ? (
                <div className="space-y-2">
                  <div className="px-1 text-xs font-semibold text-white">Raise a support ticket</div>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none"
                  />
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Your email"
                    type="email"
                    className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none"
                  />
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Subject (optional)"
                    className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none"
                  />
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help?"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none"
                  />
                  {formError && <p className="px-1 text-xs text-brand-300">{formError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setMode('menu'); setFormError(null) }}
                      className="flex-1 rounded-lg border border-white/10 py-2 text-sm font-medium text-gray-300 hover:bg-white/[0.06]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitTicket()}
                      disabled={sending}
                      className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {BOT_TOPICS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickTopic(t.id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-brand-500/40 hover:text-white"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('ticket')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500/[0.12] py-2 text-sm font-semibold text-brand-200 ring-1 ring-inset ring-brand-500/30 transition-colors hover:bg-brand-500/[0.2]"
                  >
                    <LifeBuoy className="h-4 w-4" /> Raise a support ticket
                  </button>
                  <p className="px-1 text-center text-[10px] leading-tight text-gray-500">
                    Not investment advice. Trading involves risk.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
