import { z } from 'zod'

const signUpErrorCodeSchema = z.enum(['invalid_request', 'conflict', 'internal_error'])

const signUpUserSchema = z
  .object({
    email: z.string().email(),
    id: z.string().min(1),
    name: z.string().min(1),
  })
  .strict()

export const signUpRequestSchema = z
  .object({
    email: z.string().trim().email('Informe um e-mail valido.'),
    name: z.string().trim().min(2, 'Informe seu nome.'),
    password: z.string().min(12, 'A senha precisa ter pelo menos 12 caracteres.'),
  })
  .strict()

export const signUpResponseSchema = z
  .object({
    message: z.string().min(1),
    user: signUpUserSchema,
  })
  .strict()

export const signUpErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: signUpErrorCodeSchema,
        message: z.string().min(1),
      })
      .strict(),
  })
  .strict()

export type SignUpRequest = z.infer<typeof signUpRequestSchema>
export type SignUpResponse = z.infer<typeof signUpResponseSchema>
export type SignUpErrorResponse = z.infer<typeof signUpErrorResponseSchema>
export type SignUpErrorCode = z.infer<typeof signUpErrorCodeSchema>
