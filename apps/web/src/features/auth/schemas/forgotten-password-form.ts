import { z } from 'zod'

export const forgottenPasswordFormSchema = z.object({
  email: z.email('Informe um e-mail valido.').trim(),
})

export type ForgottenPasswordFormInput = z.input<typeof forgottenPasswordFormSchema>
export type ForgottenPasswordFormValues = z.output<typeof forgottenPasswordFormSchema>
