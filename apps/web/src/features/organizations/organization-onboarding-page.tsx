import { useRouter } from '@tanstack/react-router'
import { authClient } from '@twincam/auth/client'
import { Button } from '@twincam/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@twincam/ui/components/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@twincam/ui/components/field'
import { Input } from '@twincam/ui/components/input'
import { type FormEvent, useState } from 'react'

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function OrganizationOnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setIsSubmitting(true)

    const normalizedSlug = slugify(slug || name)
    const result = await authClient.organization.create({
      name: name.trim(),
      slug: normalizedSlug,
    })

    if (result.error) {
      setError(result.error.message ?? 'Não foi possível criar a organização.')
      setIsSubmitting(false)
      return
    }

    if (result.data?.id) {
      await authClient.organization.setActive({ organizationId: result.data.id })
    }

    await router.invalidate()
    await router.navigate({ to: '/dashboard' })
  }

  return (
    <section className='mx-auto flex min-h-full w-full max-w-xl items-center p-6'>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Crie sua organização</CardTitle>
        </CardHeader>
        <CardContent>
          <form className='flex flex-col gap-5' onSubmit={submit}>
            <Field name='organization-name'>
              <FieldLabel>Nome</FieldLabel>
              <Input
                autoFocus
                onChange={(event) => {
                  setName(event.target.value)
                  if (!slug) setSlug(slugify(event.target.value))
                }}
                placeholder='Acme'
                required
                value={name}
              />
              <FieldDescription>O nome visível para os membros do workspace.</FieldDescription>
            </Field>
            <Field name='organization-slug'>
              <FieldLabel>Slug</FieldLabel>
              <Input
                onChange={(event) => setSlug(slugify(event.target.value))}
                pattern='[a-z0-9]+(?:-[a-z0-9]+)*'
                placeholder='acme'
                required
                value={slug}
              />
              <FieldDescription>Identificador único usado em URLs e integrações.</FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
            <Button disabled={!name.trim() || !slug} loading={isSubmitting} type='submit'>
              Criar organização
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
