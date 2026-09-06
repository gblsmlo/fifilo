'use client'

import { Text } from '@fifilo/ui/components/text'
import { cn } from '@fifilo/ui/lib/utils'
import type { ComponentPropsWithoutRef } from 'react'

export interface SettingsSectionProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  /** Ausente quando o título da página já nomeia o card único. */
  title?: string
}

/**
 * O card de configurações: as `SettingsRow` divididas dentro de uma moldura.
 * Com `title` vira uma `section` nomeada, com o heading acima do card; sem
 * ele, é só o card — a página que tem um card só já o nomeia pelo próprio
 * título.
 */
export function SettingsSection({
  children,
  className,
  title,
  ...props
}: Readonly<SettingsSectionProps>) {
  const card = (
    <div className='divide-y rounded-lg border bg-card px-4' data-slot='settings-section-card'>
      {children}
    </div>
  )

  if (!title) {
    return (
      <div className={className} data-slot='settings-section' {...props}>
        {card}
      </div>
    )
  }

  return (
    <section
      aria-label={title}
      className={cn('flex flex-col gap-2', className)}
      data-slot='settings-section'
      {...props}
    >
      <Text
        render={<h2 data-slot='settings-section-title'>{title}</h2>}
        size='base'
        weight='medium'
      />
      {card}
    </section>
  )
}
