import { useForm } from 'react-hook-form'
import { Mail, MessageSquare, Info, Send } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { PageHeader } from '@/components/marketing/PageHeader'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { contactSchema, type ContactValues } from '@/lib/validation'

const channels = [
  { icon: Mail, title: 'Email Us', value: 'support@apexmarkets.io', note: 'We reply within hours' },
  { icon: MessageSquare, title: 'Live Chat', value: 'Available 24/5', note: 'Instant assistance' },
  { icon: Info, title: 'General Inquiries', value: 'info@apexmarkets.io', note: 'Partnerships & press' },
]

export default function ContactPage() {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) })

  const onSubmit = async (values: ContactValues) => {
    await new Promise((r) => setTimeout(r, 800))
    toast.success('Message sent', `Thanks ${values.fullName.split(' ')[0]}, our team will be in touch.`)
    reset()
  }

  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Contact Us']}
        title="We're here to help"
        description="Have a question or need assistance? Our team is ready to help you, around the clock."
      />

      <section className="container-x grid gap-10 py-14 lg:grid-cols-[1fr_1.2fr]">
        {/* Contact channels */}
        <div className="space-y-4">
          {channels.map((c) => (
            <Reveal key={c.title}>
              <div className="glass-panel card-lift flex items-start gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <c.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{c.title}</h3>
                  <p className="mt-0.5 font-medium text-brand-300">{c.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{c.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Form */}
        <Reveal>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="glass-panel relative overflow-hidden p-7"
            noValidate
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 bg-radial-red opacity-60 blur-2xl" />
            <h2 className="relative font-display text-xl font-semibold text-white">Send us a message</h2>
            <p className="relative mt-1 text-sm text-gray-400">
              Fill out the form and we'll get back to you shortly.
            </p>

            <div className="relative mt-6 space-y-4">
              <Input
                label="Full Name"
                placeholder="Jordan Avery"
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Subject"
                placeholder="How can we help?"
                error={errors.subject?.message}
                {...register('subject')}
              />
              <Textarea
                label="Your Message"
                placeholder="Tell us a little more…"
                error={errors.message?.message}
                {...register('message')}
              />
              <Button type="submit" fullWidth loading={isSubmitting} className="gap-2">
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </div>
          </form>
        </Reveal>
      </section>

      {/* World-map texture base */}
      <section className="relative h-48 overflow-hidden border-t border-white/[0.06]">
        <div className="grid-bg absolute inset-0 opacity-30" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 50%, rgba(225,29,46,0.10), transparent 30%), radial-gradient(circle at 70% 40%, rgba(225,29,46,0.08), transparent 35%)',
          }}
        />
        <div className="container-x relative flex h-full items-center justify-center text-center">
          <p className="text-sm text-gray-500">
            Apex Markets · Serving traders in 120+ countries worldwide
          </p>
        </div>
      </section>
    </>
  )
}
