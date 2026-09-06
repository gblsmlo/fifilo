const inputClassName =
  'h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

interface PeriodPickerProps {
  from: string
  onChange: (next: { from?: string; to?: string }) => void
  to: string
}

export function PeriodPicker({ from, onChange, to }: Readonly<PeriodPickerProps>) {
  return (
    <form className='flex flex-wrap items-end gap-3' onSubmit={(event) => event.preventDefault()}>
      <label className='flex flex-col gap-1 text-sm'>
        De
        <input
          className={inputClassName}
          onChange={(event) => onChange({ from: event.target.value || undefined })}
          type='date'
          value={from}
        />
      </label>
      <label className='flex flex-col gap-1 text-sm'>
        Até
        <input
          className={inputClassName}
          onChange={(event) => onChange({ to: event.target.value || undefined })}
          type='date'
          value={to}
        />
      </label>
    </form>
  )
}
