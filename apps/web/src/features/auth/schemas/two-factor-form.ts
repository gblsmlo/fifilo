import { z } from 'zod'

export const twoFactorFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, 'Informe o codigo de 6 digitos.')
    .max(8, 'O codigo deve ter no maximo 8 digitos.')
    .regex(/^\d+$/, 'Use apenas numeros.'),
})

export type TwoFactorFormInput = z.input<typeof twoFactorFormSchema>
export type TwoFactorFormValues = z.output<typeof twoFactorFormSchema>
