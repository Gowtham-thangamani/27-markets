import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input, Select } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { demoSchema, type DemoValues } from '@/lib/validation'
import { leadsApi } from '@/lib/leadsApi'
import { useSeo } from '@/lib/useSeo'
import { useT } from '@/i18n/LanguageContext'

export default function DemoPage() {
  useSeo({ title: 'Free Demo Account — 27 Markets', description: 'Practice trading risk-free with a funded demo account.' })
  const toast = useToast()
  const navigate = useNavigate()
  const t = useT()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DemoValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: { platform: 'WebTrader', balance: '50000' },
  })

  const onSubmit = async (values: DemoValues) => {
    try {
      // Capture the prospect as a CRM lead (sales follows up).
      await leadsApi.capture({
        name: values.name,
        email: values.email,
        source: 'DEMO',
        message: `Demo request — platform: ${values.platform}, virtual balance: $${Number(values.balance).toLocaleString()}`,
      })
      toast.success(t('auth.demo.requested'), t('auth.demo.requestedBody'))
      navigate('/login')
    } catch (err) {
      toast.error(t('auth.demo.failed'), (err as Error).message)
    }
  }

  return (
    <AuthShell
      aside={
        <>
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            {t('auth.demo.asideT1')} <span className="text-gradient-red">{t('auth.demo.asideTg')}</span>
          </h2>
          <p className="mt-4 max-w-sm text-gray-400">{t('auth.demo.asideDesc')}</p>
        </>
      }
    >
      <h1 className="font-display text-3xl font-bold text-white">{t('auth.demo.title')}</h1>
      <p className="mt-2 text-sm text-gray-400">{t('auth.demo.sub')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input label={t('auth.demo.fullName')} placeholder="Jordan Avery" error={errors.name?.message} {...register('name')} />
        <Input label={t('auth.email')} type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <Select
          label={t('auth.demo.platform')}
          options={[
            { value: 'WebTrader', label: t('auth.demo.platWeb') },
            { value: 'Desktop', label: t('auth.demo.platDesktop') },
            { value: 'Mobile', label: t('auth.demo.platMobile') },
          ]}
          error={errors.platform?.message}
          {...register('platform')}
        />
        <Select
          label={t('auth.demo.balance')}
          options={[
            { value: '10000', label: '$10,000' },
            { value: '50000', label: '$50,000' },
            { value: '100000', label: '$100,000' },
          ]}
          error={errors.balance?.message}
          {...register('balance')}
        />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {t('auth.demo.btn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        {t('auth.demo.ready')}{' '}
        <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
          {t('auth.demo.openLive')}
        </Link>
      </p>
    </AuthShell>
  )
}
