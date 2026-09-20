'use client'

import { ExternalLinkIcon } from 'lucide-react'
import type React from 'react'

export interface PropertyLinkProps {
  href: string
  /** Names the destination: "Abrir" repeated across a whole sidebar leaves no way to choose. */
  label: string
}

export function PropertyLink({ href, label }: Readonly<PropertyLinkProps>): React.ReactElement {
  return (
    <a
      aria-label={label}
      className='flex h-full shrink-0 items-center px-1.5 opacity-80 transition-opacity hover:opacity-100'
      data-slot='property-link'
      href={href}
      rel='noreferrer'
      target='_blank'
    >
      <ExternalLinkIcon aria-hidden='true' className='size-3' />
    </a>
  )
}
