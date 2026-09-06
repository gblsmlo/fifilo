import { z } from 'zod'

export const publicUserSchema = z.object({
  email: z.string().email(),
  id: z.string().min(1),
  image: z.string().nullable(),
  name: z.string().min(1),
})

export const publicOrganizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
})

export const currentUserResponseSchema = z.object({
  organization: publicOrganizationSchema.nullable(),
  role: z.string().min(1).nullable(),
  user: publicUserSchema,
})

export type PublicUser = z.infer<typeof publicUserSchema>
export type PublicOrganization = z.infer<typeof publicOrganizationSchema>
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>
