/**
 * Mock data for the Auth stories. Server messages live here because they are
 * network responses, not product copy: what the form emits on its own lives in
 * the schema, and toast copy lives in `../feedback`.
 */
export const authStoryFixtures = {
  conflictMessage: 'Ja existe uma conta com este e-mail.',
  email: 'ana.souza@fifilo.test',
  expiredTokenMessage: 'O link de redefinicao expirou. Solicite um novo.',
  invalidCredentialsMessage: 'E-mail ou senha invalidos.',
  invalidTotpMessage: 'Codigo invalido ou ja utilizado.',
  name: 'Ana Souza',
  password: 'seed-demo-password-123',
  redirectTo: '/dashboard',
  resetToken: 'story-reset-token',
  signUpMessage: 'Conta criada com sucesso. Entre para continuar.',
  totpCode: '123456',
  unreachableMessage: 'Nao foi possivel falar com o servidor. Tente novamente.',
} as const
