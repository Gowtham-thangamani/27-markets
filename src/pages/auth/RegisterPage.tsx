import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input, Select } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { registerStep1, registerStep2, registerStep3 } from '@/lib/validation'
import { api, ApiError } from '@/lib/api'
import { accountTypeToApi } from '@/lib/apiMappers'
import { countries } from '@/lib/countries'
import { cn } from '@/lib/cn'

type Errors = Record<string, string>

const steps = ['Your details', 'Account setup', 'Security']

const accountTypes: Array<'Standard' | 'Raw Spread' | 'VIP'> = ['Standard', 'Raw Spread', 'VIP']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? undefined

  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    country: '',
    address: '',
    city: '',
    postalCode: '',
    accountType: (params.get('account') as 'Standard' | 'Raw Spread' | 'VIP') || 'Raw Spread',
    currency: 'USD' as 'USD' | 'EUR' | 'GBP',
    password: '',
    confirm: '',
    agree: false,
  })

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validateStep = () => {
    const schema = [registerStep1, registerStep2, registerStep3][step]
    const result = schema.safeParse(form)
    if (result.success) {
      setErrors({})
      return true
    }
    const next: Errors = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!next[path]) next[path] = issue.message
    }
    setErrors(next)
    return false
  }

  const onNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  const onSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      await registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        country: form.country,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        postalCode: form.postalCode || undefined,
        acceptTerms: form.agree,
        ...(ref ? { ref } : {}),
      })
      // Open the account type the user selected during onboarding.
      try {
        await api.post('/accounts', {
          type: accountTypeToApi[form.accountType],
          mode: 'LIVE',
        })
      } catch {
        /* non-fatal: they can open one from the portal */
      }
      toast.success('Account created', 'Welcome to 27 Markets. Complete KYC to start trading.')
      navigate('/portal/dashboard', { replace: true })
    } catch (err) {
      const e = err as ApiError
      setSubmitting(false)
      if (e.status === 409) {
        setStep(0)
        setErrors({ email: 'An account with this email already exists' })
      }
      toast.error('Registration failed', e.message || 'Please review your details and try again.')
    }
  }

  return (
    <AuthShell
      aside={
        <>
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            Open your account <span className="text-gradient-red">in minutes.</span>
          </h2>
          <p className="mt-4 max-w-sm text-gray-400">
            Three simple steps to start trading 100+ markets with up to 1:500 leverage.
          </p>
        </>
      }
    >
      <h1 className="font-display text-3xl font-bold text-white">Create your account</h1>
      {ref && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-3 py-1 text-xs text-brand-300">
          Referred by a partner
        </p>
      )}
      <p className="mt-2 text-sm text-gray-400">Step {step + 1} of {steps.length} — {steps[step]}</p>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                i < step
                  ? 'bg-brand-500 text-white'
                  : i === step
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50'
                  : 'bg-ink-600 text-gray-500'
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-px flex-1', i < step ? 'bg-brand-500' : 'bg-ink-400')} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-7 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First name" value={form.firstName} error={errors.firstName} onChange={(e) => set('firstName', e.target.value)} />
                  <Input label="Last name" value={form.lastName} error={errors.lastName} onChange={(e) => set('lastName', e.target.value)} />
                </div>
                <Input label="Email" type="email" value={form.email} error={errors.email} onChange={(e) => set('email', e.target.value)} />
                <Input label="Phone" value={form.phone} placeholder="+971 50 000 0000" error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
                <Input label="Date of birth" type="date" value={form.dateOfBirth} error={errors.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
              </>
            )}

            {step === 1 && (
              <>
                <Select
                  label="Country of residence"
                  placeholder="Select your country"
                  value={form.country}
                  error={errors.country}
                  options={countries.map((c) => ({ value: c, label: c }))}
                  onChange={(e) => set('country', e.target.value)}
                />
                <Input label="Address" value={form.address} placeholder="Street address" error={errors.address} onChange={(e) => set('address', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" value={form.city} error={errors.city} onChange={(e) => set('city', e.target.value)} />
                  <Input label="Postal code" value={form.postalCode} error={errors.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-gray-300">Account type</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
                    {accountTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={form.accountType === t}
                        onClick={() => set('accountType', t)}
                        className={cn(
                          'rounded-xl border px-2 py-3 text-center text-sm font-medium transition-colors',
                          form.accountType === t
                            ? 'border-brand-500/60 bg-brand-500/10 text-white'
                            : 'border-white/10 text-gray-400 hover:border-white/20'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Select
                  label="Base currency"
                  value={form.currency}
                  options={[
                    { value: 'USD', label: 'USD — US Dollar' },
                    { value: 'EUR', label: 'EUR — Euro' },
                    { value: 'GBP', label: 'GBP — British Pound' },
                  ]}
                  onChange={(e) => set('currency', e.target.value)}
                />
              </>
            )}

            {step === 2 && (
              <>
                <Input label="Password" type="password" value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)} />
                <Input label="Confirm password" type="password" value={form.confirm} error={errors.confirm} onChange={(e) => set('confirm', e.target.value)} />
                <label className="flex items-start gap-3 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={form.agree}
                    onChange={(e) => set('agree', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-ink-800 accent-brand-500"
                  />
                  <span>
                    I agree to the{' '}
                    <Link
                      to="/legal/client-agreement"
                      target="_blank"
                      className="font-medium text-brand-400 underline underline-offset-2 hover:text-brand-300"
                    >
                      Client Agreement
                    </Link>{' '}
                    and{' '}
                    <Link
                      to="/legal/risk-disclosure"
                      target="_blank"
                      className="font-medium text-brand-400 underline underline-offset-2 hover:text-brand-300"
                    >
                      Risk Disclosure
                    </Link>
                    .
                  </span>
                </label>
                {errors.agree && <p className="text-xs text-danger">{errors.agree}</p>}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button onClick={onNext} fullWidth className="gap-1">
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onSubmit} fullWidth loading={submitting}>
            Create account
          </Button>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
          Login
        </Link>
      </p>
    </AuthShell>
  )
}
