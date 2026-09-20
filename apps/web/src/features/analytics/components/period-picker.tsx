import { Field, FieldLabel } from '@fifilo/ui/components/field'
import { Form } from '@fifilo/ui/components/form'
import { Input } from '@fifilo/ui/components/input'

interface PeriodPickerProps {
  from: string
  onChange: (next: { from?: string; to?: string }) => void
  to: string
}

export function PeriodPicker({ from, onChange, to }: Readonly<PeriodPickerProps>) {
  return (
    <Form className='flex flex-wrap items-end gap-3' onSubmit={(event) => event.preventDefault()}>
      <Field name='from'>
        <FieldLabel>De</FieldLabel>
        <Input
          onChange={(event) => onChange({ from: event.target.value || undefined })}
          type='date'
          value={from}
        />
      </Field>
      <Field name='to'>
        <FieldLabel>Até</FieldLabel>
        <Input
          onChange={(event) => onChange({ to: event.target.value || undefined })}
          type='date'
          value={to}
        />
      </Field>
    </Form>
  )
}
