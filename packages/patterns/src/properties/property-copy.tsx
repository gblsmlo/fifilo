'use client'

import { copyToClipboard } from '@fifilo/ui/lib/clipboard'
import { CopyIcon } from 'lucide-react'
import type React from 'react'

export interface PropertyCopyProps {
  /** Names what goes to the clipboard: "Copiar" across a whole sidebar leaves no way to choose. */
  label: string
  value: string
}

export function PropertyCopy({ label, value }: Readonly<PropertyCopyProps>): React.ReactElement {
  return (
    <button
      aria-label={label}
      className='h-full shrink-0 cursor-pointer px-1.5 opacity-80 transition-opacity hover:opacity-100'
      data-slot='property-copy'
      // The browser's refusal — permission denied, insecure context — does not
      // surface as an unhandled rejection: there is nothing to tell the reader
      // beyond the copy not having happened.
      onClick={() => void copyToClipboard(value)?.catch(() => undefined)}
      type='button'
    >
      <CopyIcon aria-hidden='true' className='size-3' />
    </button>
  )
}
