import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input, Select } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { demoSchema, type DemoValues } from '@/lib/validation'
import { leadsApi } from '@/lib/leadsApi'

export default function DemoPage() {
  const toast = useToast()
  const navigate = useNavigate()
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
      toast.success('Demo requested', 'Our team will email your demo login and virtual funds shortly.')
      navigate('/login')
    } catch (err) {
      toast.error('Could not submit request', (err as Error).message)
    }
  }

  return (
    <AuthShell
      aside={
        <>
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            Practice risk-free with a <span className="text-gradient-red">free demo.</span>
          </h2>
          <p className="mt-4 max-w-sm text-gray-400">
            Trade live market conditions with virtual funds — no deposit, no risk.
          </p>
        </>
      }
    >
      <h1 className="font-display text-3xl font-bold text-white">Try a free demo</h1>
      <p className="mt-2 text-sm text-gray-400">
        Get a demo account preloaded with virtual funds in seconds.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input label="Full name" placeholder="Jordan Avery" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <Select
          label="Preferred platform"
          options={[
            { value: 'WebTrader', label: 'WebTrader (browser)' },
            { value: 'Desktop', label: 'Desktop terminal' },
            { value: 'Mobile', label: 'Mobile app' },
          ]}
          error={errors.platform?.message}
          {...register('platform')}
        />
        <Select
          label="Virtual balance"
          options={[
            { value: '10000', label: '$10,000' },
            { value: '50000', label: '$50,000' },
            { value: '100000', label: '$100,000' },
          ]}
          error={errors.balance?.message}
          {...register('balance')}
        />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Create Demo Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Ready for the real thing?{' '}
        <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
          Open Live Account
        </Link>
      </p>
    </AuthShell>
  )
}
