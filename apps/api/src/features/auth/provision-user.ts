import { auth } from '@twincam/auth/server'

export interface ProvisionVerifiedUserInput {
  email: string
  name: string
  password: string
}

export async function provisionVerifiedCredentialUser({
  email,
  name,
  password,
}: Readonly<ProvisionVerifiedUserInput>) {
  const ctx = await auth.$context
  const user = await ctx.internalAdapter.createUser({
    email,
    emailVerified: true,
    name,
  })

  const hashedPassword = await ctx.password.hash(password)
  await ctx.internalAdapter.linkAccount({
    accountId: user.id,
    password: hashedPassword,
    providerId: 'credential',
    userId: user.id,
  })

  return user
}
