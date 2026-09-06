import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import type { z } from 'zod'

import { users } from '../schema'

export const internalUserRowSchema = createSelectSchema(users)

export const internalUserInsertSchema = createInsertSchema(users, {
  email: (schema) => schema.email(),
  name: (schema) => schema.trim().min(1).max(120),
})

export const internalUserUpdateSchema = createUpdateSchema(users, {
  email: (schema) => schema.email(),
  name: (schema) => schema.trim().min(1).max(120),
})

export type InternalUserRow = z.infer<typeof internalUserRowSchema>
export type InternalUserInsert = z.infer<typeof internalUserInsertSchema>
export type InternalUserUpdate = z.infer<typeof internalUserUpdateSchema>
