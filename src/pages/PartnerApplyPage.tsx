import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { partnersApi } from '@/lib/partnersApi'
import { track } from '@/lib/analytics'
import { useT } from '@/i18n/LanguageContext'

type FormValues = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  country?: string
  company?: string
  website?: string
  audience?: string
}

export default function PartnerApplyPage() {
  const toast = useToast()
  const t = useT()
  const [done, setDone] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(2, t('pap.reqRequired')),
        lastName: z.string().min(2, t('pap.reqRequired')),
        email: z.string().email(t('pap.reqEmail')),
        phone: z.string().max(32).optional().or(z.literal('')),
        country: z.string().max(80).optional().or(z.literal('')),
        company: z.string().max(120).optional().or(z.literal('')),
        website: z.string().max(200).optional().or(z.literal('')),
        audience: z.string().max(2000).optional().or(z.literal('')),
      }),
    [t],
  )

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
      track('generate_lead', { type: 'partner_application' })
      setDone(true)
    } catch (e) {
      toast.error(t('pap.errTitle'), e instanceof ApiError ? e.message : t('pap.errBody'))
    }
  }

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-white">{t('pap.doneTitle')}</h1>
        <p className="mt-3 text-gray-400">{t('pap.doneBody')}</p>
      </div>
    )
  }

  return (
    <div className="container-x max-w-2xl py-16">
      <h1 className="font-display text-3xl font-bold text-white">{t('pap.title')}</h1>
      <p className="mt-2 text-gray-400">{t('pap.desc')}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-4 sm:grid-cols-2">
        <Input label={t('pap.firstName')} {...register('firstName')} error={errors.firstName?.message} />
        <Input label={t('pap.lastName')} {...register('lastName')} error={errors.lastName?.message} />
        <Input
          label={t('pap.email')}
          type="email"
          className="sm:col-span-2"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input label={t('pap.phone')} {...register('phone')} error={errors.phone?.message} />
        <Input label={t('pap.country')} {...register('country')} error={errors.country?.message} />
        <Input label={t('pap.company')} {...register('company')} error={errors.company?.message} />
        <Input label={t('pap.website')} {...register('website')} error={errors.website?.message} />
        <Input
          label={t('pap.audience')}
          className="sm:col-span-2"
          {...register('audience')}
          error={errors.audience?.message}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="sm:col-span-2">
          {t('pap.apply')}
        </Button>
      </form>
    </div>
  )
}
