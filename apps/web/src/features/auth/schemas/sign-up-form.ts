import { signUpRequestSchema } from '@twincam/core/contracts/auth'
import { z } from 'zod'

export const signUpFormSchema = signUpRequestSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas precisam coincidir.',
    path: ['confirmPassword'],
  })
  .transform(({ confirmPassword: _confirmPassword, ...request }) => request)

export type SignUpFormInput = z.input<typeof signUpFormSchema>
export type SignUpFormValues = z.output<typeof signUpFormSchema>
