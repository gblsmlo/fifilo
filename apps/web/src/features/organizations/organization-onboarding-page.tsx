import { authClient } from '@fifilo/auth/client'
import { Button } from '@fifilo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@fifilo/ui/components/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'
import { useRouter } from '@tanstack/react-router'
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
  // The slug is an address, not a decision anyone opens the product to make.
  // It stays derived from the name until the server says that one is taken,
  // which is the only moment the person has something to answer.
  const [slugVisible, setSlugVisible] = useState(false)

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
      setSlug(normalizedSlug)
      setSlugVisible(true)
      setIsSubmitting(false)
      return
    }

    if (result.data?.id) {
      await authClient.organization.setActive({ organizationId: result.data.id })
    }

    await router.invalidate()
    await router.navigate({ to: '/onboarding/setup' })
  }

  return (
    <section className='mx-auto flex min-h-full w-full max-w-xl items-center p-6'>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Como vamos chamar seu workspace?</CardTitle>
        </CardHeader>
        <CardContent>
          <Form className='flex flex-col gap-5' onSubmit={submit}>
            <Field name='organization-name'>
              <FieldLabel>Nome</FieldLabel>
              <Input
                autoFocus
                onChange={(event) => {
                  setName(event.target.value)
                  if (!slugVisible) setSlug(slugify(event.target.value))
                }}
                placeholder='Acme'
                required
                value={name}
              />
              <FieldDescription>O nome visível para os membros do workspace.</FieldDescription>
              {slugVisible ? null : <FieldError>{error}</FieldError>}
            </Field>
            {slugVisible ? (
              <Field name='organization-slug'>
                <FieldLabel>Endereço</FieldLabel>
                <Input
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  pattern='[a-z0-9]+(?:-[a-z0-9]+)*'
                  placeholder='acme'
                  required
                  value={slug}
                />
                <FieldDescription>
                  Identificador único usado em URLs e integrações.
                </FieldDescription>
                <FieldError>{error}</FieldError>
              </Field>
            ) : null}
            <Button disabled={!name.trim()} loading={isSubmitting} type='submit'>
              Continuar
            </Button>
          </Form>
        </CardContent>
      </Card>
    </section>
  )
}
