import { useForm } from 'react-hook-form'
import { Mail, Lock } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/layouts/AuthShell'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { zodResolver } from '@/lib/zodResolver'
import { loginSchema, type LoginValues } from '@/lib/validation'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/portal/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values.email, values.password)
      toast.success('Welcome back', 'You are now signed in to your portal.')
      navigate(from, { replace: true })
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'TwoFactorRequired') {
        toast.warning('Two-factor required', 'This account has 2FA enabled. Enter your code to continue.')
      } else {
        toast.error('Login failed', e.message || 'Invalid credentials. Please try again.')
      }
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold text-white">Welcome back</h1>
      <p className="mt-2 text-sm text-gray-400">Log in to access your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input
          label="Email or Username"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <button type="button" className="text-sm font-medium text-brand-400 hover:text-brand-300">
            Forgot Password?
          </button>
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
          Register
        </Link>
      </p>

      <p className="mt-6 rounded-lg border border-white/[0.06] bg-ink-800/50 p-3 text-center text-xs text-gray-500">
        Demo mode — any email and a 6+ character password will sign you in.
      </p>
    </AuthShell>
  )
}
