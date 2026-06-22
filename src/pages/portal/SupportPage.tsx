import { useForm } from 'react-hook-form'
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Input, Select, Textarea, Modal, EmptyState } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { statusTone } from '@/components/portal/statusTone'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { ticketSchema } from '@/lib/validation'
import { formatDate } from '@/lib/format'
import { z } from 'zod'

type TicketValues = z.infer<typeof ticketSchema>

const priorityTone = { Low: 'neutral', Medium: 'warning', High: 'danger' } as const

export default function SupportPage() {
  const { tickets, addTicket } = usePortalData()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: 'Account', priority: 'Medium' },
  })

  const onSubmit = async (values: TicketValues) => {
    await new Promise((r) => setTimeout(r, 600))
    addTicket(values)
    toast.success('Ticket created', 'Our support team will respond shortly.')
    reset()
    setOpen(false)
  }

  return (
    <>
      <PageTitle
        title="Support"
        subtitle="Get help from our team — we're here 24/5."
        action={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        }
      />

      {/* Quick help cards */}
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

      {/* Ticket list */}
      <h2 className="mb-3 font-display text-lg font-semibold text-white">Your tickets</h2>
      {tickets.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No tickets yet"
          description="Create a ticket and our team will get back to you."
          action={<Button onClick={() => setOpen(true)}>New Ticket</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="glass-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-gray-500">{t.id}</span>
                  <h3 className="font-medium text-white">{t.subject}</h3>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-gray-400">{t.message}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {t.category} · {formatDate(t.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={priorityTone[t.priority]}>{t.priority}</Badge>
                <Badge tone={statusTone(t.status)} dot>
                  {t.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New ticket modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Create a support ticket">
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
              options={['Low', 'Medium', 'High'].map((p) => ({ value: p, label: p }))}
              error={errors.priority?.message}
              {...register('priority')}
            />
          </div>
          <Textarea label="Describe your issue" placeholder="Tell us what's going on…" error={errors.message?.message} {...register('message')} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={isSubmitting}>
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
