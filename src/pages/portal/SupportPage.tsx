import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LifeBuoy, Plus, MessageSquare, Send } from 'lucide-react'
import { Badge, Button, Input, Select, Textarea, Modal, EmptyState, ErrorState, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { formatDate, formatDateTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import {
  supportApi,
  ticketStatusLabel,
  ticketStatusTone,
  ticketPriorityLabel,
  ticketPriorityTone,
  type TicketDetail,
  type TicketListItem,
} from '@/lib/supportApi'
import { z } from 'zod'

const createSchema = z.object({
  subject: z.string().min(4, 'Add a subject'),
  category: z.enum(['Account', 'Funding', 'Technical', 'Partnership', 'Other']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  message: z.string().min(5, 'Describe your issue in more detail'),
})
type CreateValues = z.infer<typeof createSchema>

export default function SupportPage() {
  const toast = useToast()
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [active, setActive] = useState<TicketDetail | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTickets(await supportApi.list())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle
        title="Support"
        subtitle="Get help from our team — we're here 24/5."
        action={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Live Chat', desc: 'Chat with an agent now', cta: 'Start chat' },
          { title: 'Help Center', desc: 'Browse guides & FAQs', cta: 'Open' },
          { title: 'Call Us', desc: '+971 4 000 0000', cta: 'Call' },
        ].map((c) => (
          <div key={c.title} className="glass-panel card-lift p-5">
            <LifeBuoy className="h-6 w-6 text-brand-400" />
            <h3 className="mt-3 font-display text-base font-semibold text-white">{c.title}</h3>
            <p className="mt-1 text-sm text-gray-400">{c.desc}</p>
            <button
              onClick={() => toast.info(c.title, 'This is a demo action.')}
              className="mt-3 text-sm font-medium text-brand-400 hover:text-brand-300"
            >
              {c.cta} →
            </button>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-white">Your tickets</h2>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No tickets yet"
          description="Create a ticket and our team will get back to you."
          action={<Button onClick={() => setCreateOpen(true)}>New Ticket</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                try {
                  setActive(await supportApi.get(t.id))
                } catch (e) {
                  toast.error('Could not open ticket', (e as Error).message)
                }
              }}
              className="glass-panel card-lift flex w-full flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">#{t.id.slice(-6)}</span>
                  <h3 className="font-medium text-white">{t.subject}</h3>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {t.category} · {t._count.messages} message{t._count.messages === 1 ? '' : 's'} ·{' '}
                  {formatDate(t.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={ticketPriorityTone[t.priority]}>{ticketPriorityLabel[t.priority]}</Badge>
                <Badge tone={ticketStatusTone[t.status]} dot>
                  {ticketStatusLabel[t.status]}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          void load()
        }}
      />

      <TicketThreadModal
        ticket={active}
        onClose={() => setActive(null)}
        onReplied={async (id) => {
          setActive(await supportApi.get(id))
          void load()
        }}
      />
    </>
  )
}

function CreateTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { category: 'Account', priority: 'MEDIUM' },
  })

  const onSubmit = async (values: CreateValues) => {
    try {
      await supportApi.create(values)
      toast.success('Ticket created', 'Our support team will respond shortly.')
      reset()
      onCreated()
    } catch (e) {
      toast.error('Could not create ticket', (e as Error).message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a support ticket">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Subject" placeholder="Brief summary of your issue" error={errors.subject?.message} {...register('subject')} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            options={['Account', 'Funding', 'Technical', 'Partnership', 'Other'].map((c) => ({ value: c, label: c }))}
            error={errors.category?.message}
            {...register('category')}
          />
          <Select
            label="Priority"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
            error={errors.priority?.message}
            {...register('priority')}
          />
        </div>
        <Textarea label="Describe your issue" placeholder="Tell us what's going on…" error={errors.message?.message} {...register('message')} />
        <div className="flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={isSubmitting}>
            Submit Ticket
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TicketThreadModal({
  ticket,
  onClose,
  onReplied,
}: {
  ticket: TicketDetail | null
  onClose: () => void
  onReplied: (id: string) => void | Promise<void>
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const toast = useToast()

  const send = async () => {
    if (!ticket || body.trim().length === 0) return
    setSending(true)
    try {
      await supportApi.reply(ticket.id, body.trim())
      setBody('')
      await onReplied(ticket.id)
    } catch (e) {
      toast.error('Could not send reply', (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title={ticket?.subject} description={ticket ? `${ticket.category} · ${ticketStatusLabel[ticket.status]}` : undefined} className="max-w-xl">
      {ticket && (
        <div className="space-y-4">
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {ticket.messages.map((m) => {
              const staff = m.author.role !== 'CLIENT'
              return (
                <div key={m.id} className={staff ? 'text-right' : 'text-left'}>
                  <div
                    className={`inline-block max-w-[85%] rounded-2xl px-4 py-2.5 text-left text-sm ${
                      staff ? 'bg-brand-500/15 text-gray-100 ring-1 ring-brand-500/25' : 'bg-ink-700 text-gray-200'
                    }`}
                  >
                    <p className="mb-1 text-[11px] font-medium text-gray-400">
                      {m.author.firstName} {m.author.lastName} {staff && '· Support'} · {formatDateTime(m.createdAt)}
                    </p>
                    {m.body}
                  </div>
                </div>
              )
            })}
          </div>

          {ticket.status !== 'RESOLVED' ? (
            <div className="flex items-end gap-2">
              <Textarea
                label=""
                placeholder="Write a reply…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[64px]"
              />
              <Button onClick={send} loading={sending} className="mb-0.5 gap-1.5">
                <Send className="h-4 w-4" /> Send
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-white/[0.06] bg-ink-800/50 p-3 text-center text-sm text-gray-400">
              This ticket is resolved. Replying will re-open it.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
