import type { Resolver, FieldValues } from 'react-hook-form'
import type { ZodSchema } from 'zod'

/**
 * Minimal react-hook-form resolver for Zod schemas.
 * Avoids pulling in @hookform/resolvers for our handful of forms.
 */
export function zodResolver<T extends FieldValues>(schema: ZodSchema<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return { values: result.data, errors: {} }
    }
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root'
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: issue.message }
      }
    }
    return { values: {}, errors: errors as never }
  }
}
