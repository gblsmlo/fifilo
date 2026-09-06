import { z } from 'zod'

export const signInFormSchema = z.object({
  email: z.email('Informe um e-mail valido.').trim(),
  password: z.string().min(1, 'Informe sua senha.'),
})

export type SignInFormInput = z.input<typeof signInFormSchema>
export type SignInFormValues = z.output<typeof signInFormSchema>
