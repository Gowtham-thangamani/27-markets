import { z } from 'zod'

export const contactSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Enter a valid email address'),
  subject: z.string().min(3, 'Please add a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})
export type ContactValues = z.infer<typeof contactSchema>

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerStep1 = z.object({
  firstName: z.string().min(2, 'Enter your first name'),
  lastName: z.string().min(2, 'Enter your last name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
})
export const registerStep2 = z.object({
  country: z.string().min(1, 'Select your country'),
  accountType: z.enum(['Standard', 'Raw Spread', 'VIP']),
  currency: z.enum(['USD', 'EUR', 'GBP']),
})
export const registerStep3 = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
    agree: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export const demoSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  platform: z.enum(['Desktop', 'Mobile', 'WebTrader']),
  balance: z.enum(['10000', '50000', '100000']),
})
export type DemoValues = z.infer<typeof demoSchema>

export const depositSchema = z.object({
  account: z.string().min(1, 'Select an account'),
  amount: z.coerce.number().positive('Enter an amount greater than 0').max(1_000_000, 'Amount too large'),
})

export const transferSchema = z
  .object({
    from: z.string().min(1, 'Select source account'),
    to: z.string().min(1, 'Select destination account'),
    amount: z.coerce.number().positive('Enter an amount greater than 0'),
  })
  .refine((d) => d.from !== d.to, { message: 'Accounts must differ', path: ['to'] })

export const ticketSchema = z.object({
  subject: z.string().min(4, 'Add a subject'),
  category: z.enum(['Account', 'Funding', 'Technical', 'Partnership', 'Other']),
  priority: z.enum(['Low', 'Medium', 'High']),
  message: z.string().min(10, 'Describe your issue in more detail'),
})

export const profileSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  country: z.string().min(2, 'Enter your country'),
})
