import { Input } from '@fifilo/ui/components/input'

interface PeriodPickerProps {
  from: string
  onChange: (next: { from?: string; to?: string }) => void
  to: string
}

export function PeriodPicker({ from, onChange, to }: Readonly<PeriodPickerProps>) {
  return (
    <form className='flex flex-wrap items-end gap-3' onSubmit={(event) => event.preventDefault()}>
      <label className='flex flex-col gap-1 text-sm' htmlFor='analytics-from'>
        <span>De</span>
        <Input
          id='analytics-from'
          onChange={(event) => onChange({ from: event.target.value || undefined })}
          type='date'
          value={from}
        />
      </label>
      <label className='flex flex-col gap-1 text-sm' htmlFor='analytics-to'>
        <span>Até</span>
        <Input
          id='analytics-to'
          onChange={(event) => onChange({ to: event.target.value || undefined })}
          type='date'
          value={to}
        />
      </label>
    </form>
  )
}
