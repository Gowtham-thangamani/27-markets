import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, MapPin, Send } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { PageHeader } from '@/components/marketing/PageHeader'
import { useToast } from '@/context/ToastContext'
import { asset } from '@/lib/asset'
import { api, ApiError } from '@/lib/api'
import { zodResolver } from '@/lib/zodResolver'
import { contactSchema, type ContactValues } from '@/lib/validation'
import { useT } from '@/i18n/LanguageContext'

const channels = [
  { icon: Mail, tKey: 'ctp.c1t', value: 'info@27markets.com', noteKey: 'ctp.c1note' },
  { icon: MessageSquare, tKey: 'ctp.c2t', valueKey: 'ctp.c2v', noteKey: 'ctp.c2note' },
  {
    icon: MapPin,
    tKey: 'ctp.c3t',
    value: 'Ground Floor, The Sotheby Building, Rodney Village, Rodney Bay, Gros-Islet, Saint Lucia',
    noteKey: 'ctp.c3note',
  },
]

export default function ContactPage() {
  const toast = useToast()
  const t = useT()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) })

  const onSubmit = async (values: ContactValues) => {
    try {
      await api.post('/leads', {
        name: values.fullName,
        email: values.email,
        subject: values.subject,
        message: values.message,
        source: 'MANUAL',
      })
      toast.success(
        t('ctp.toastTitle'),
        t('ctp.toastBody').replace('{name}', values.fullName.split(' ')[0]),
      )
      reset()
    } catch (e) {
      toast.error(
        'Message not sent',
        e instanceof ApiError ? e.message : 'Please try again, or email info@27markets.com.',
      )
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Contact Us']}
        title={t('ctp.title')}
        description={t('ctp.desc')}
      />

      <section className="container-x grid gap-10 py-14 lg:grid-cols-[1fr_1.2fr]">
        {/* Contact channels */}
        <div className="space-y-4">
          <Reveal>
            <img
              src={asset('hero-trading.webp')}
              alt="27 Markets — bull market strength"
              className="mb-2 w-full select-none rounded-2xl drop-shadow-[0_30px_90px_rgba(225,29,46,0.3)]"
            />
          </Reveal>
          {channels.map((c) => (
            <Reveal key={c.tKey}>
              <div className="glass-panel card-lift flex items-start gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <c.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{t(c.tKey)}</h3>
                  <p className="mt-0.5 font-medium text-brand-300">{c.valueKey ? t(c.valueKey) : c.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{t(c.noteKey)}</p>
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
            <h2 className="relative font-display text-xl font-semibold text-white">{t('ctp.formTitle')}</h2>
            <p className="relative mt-1 text-sm text-gray-400">{t('ctp.formDesc')}</p>

            <div className="relative mt-6 space-y-4">
              <Input
                label={t('ctp.fullName')}
                placeholder={t('ctp.phFullName')}
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label={t('ctp.email')}
                type="email"
                placeholder={t('ctp.phEmail')}
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label={t('ctp.subject')}
                placeholder={t('ctp.phSubject')}
                error={errors.subject?.message}
                {...register('subject')}
              />
              <Textarea
                label={t('ctp.message')}
                placeholder={t('ctp.phMessage')}
                error={errors.message?.message}
                {...register('message')}
              />
              <Button type="submit" fullWidth loading={isSubmitting} className="gap-2">
                <Send className="h-4 w-4" /> {t('ctp.send')}
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
        <div className="container-x relative flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-gray-400">{t('ctp.serving')}</p>
          <Link to="/register">
            <Button size="sm">{t('ctp.openAcct')}</Button>
          </Link>
        </div>
      </section>
    </>
  )
}
