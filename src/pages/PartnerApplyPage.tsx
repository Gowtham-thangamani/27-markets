import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnersApi } from '@/lib/partnersApi'

const schema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().max(32).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  company: z.string().max(120).optional().or(z.literal('')),
  website: z.string().max(200).optional().or(z.literal('')),
  audience: z.string().max(2000).optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

export default function PartnerApplyPage() {
  const toast = useToast()
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (v: FormValues) => {
    try {
      await partnersApi.apply({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || undefined,
        country: v.country || undefined,
        company: v.company || undefined,
        website: v.website || undefined,
        audience: v.audience || undefined,
      })
      setDone(true)
    } catch (e) {
      toast.error('Could not submit', e instanceof ApiError ? e.message : 'Please try again.')
    }
  }

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Application received</h1>
        <p className="mt-3 text-gray-400">
          Thank you — your partner application is under review. We'll be in touch by email.
        </p>
      </div>
    )
  }

  return (
    <div className="container-x max-w-2xl py-16">
      <h1 className="font-display text-3xl font-bold text-white">Become a partner</h1>
      <p className="mt-2 text-gray-400">
        Apply to the 27 Markets IB program. Approved partners get a referral link and a partner
        dashboard.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4 sm:grid-cols-2">
        <Input label="First name" {...register('firstName')} error={errors.firstName?.message} />
        <Input label="Last name" {...register('lastName')} error={errors.lastName?.message} />
        <Input
          label="Email"
          type="email"
          className="sm:col-span-2"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input label="Phone" {...register('phone')} error={errors.phone?.message} />
        <Input label="Country" {...register('country')} error={errors.country?.message} />
        <Input label="Company / brand" {...register('company')} error={errors.company?.message} />
        <Input label="Website" {...register('website')} error={errors.website?.message} />
        <Input
          label="Audience / how you'll promote"
          className="sm:col-span-2"
          {...register('audience')}
          error={errors.audience?.message}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="sm:col-span-2">
          Apply
        </Button>
      </form>
    </div>
  )
}
