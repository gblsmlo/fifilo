import { z } from 'zod'

export const resetPasswordFormSchema = z
  .object({
    confirmPassword: z.string().min(1, 'Confirme sua nova senha.'),
    newPassword: z.string().min(12, 'A senha precisa ter pelo menos 12 caracteres.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas precisam coincidir.',
    path: ['confirmPassword'],
  })
  .transform(({ confirmPassword: _confirmPassword, ...request }) => request)

export type ResetPasswordFormInput = z.input<typeof resetPasswordFormSchema>
export type ResetPasswordFormValues = z.output<typeof resetPasswordFormSchema>
