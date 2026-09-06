'use client'

import { Progress, ProgressIndicator, ProgressTrack } from '@fifilo/ui/components/progress'
import { cn } from '@fifilo/ui/lib/utils'
import { CheckIcon, CircleIcon } from 'lucide-react'
import type React from 'react'

export interface PasswordRequirement {
  label: string
  met: boolean
}

export interface PasswordStrengthProps extends React.ComponentPropsWithoutRef<'div'> {
  ariaLabel: string
  requirements: readonly PasswordRequirement[]
}

/**
 * Medidor de senha: uma barra de progresso e a lista do que ja foi atendido.
 *
 * O pattern nao conhece politica de senha — quem consome decide quais linhas
 * existem e quando cada uma esta atendida. Aqui fica so a leitura visual do
 * avanco e o anuncio de cada linha para leitor de tela.
 */
export function PasswordStrength({
  ariaLabel,
  className,
  requirements,
  ...props
}: PasswordStrengthProps): React.ReactElement {
  const met = requirements.filter((requirement) => requirement.met).length

  return (
    <div
      className={cn('flex w-full flex-col gap-2', className)}
      data-slot='password-strength'
      {...props}
    >
      <Progress aria-label={ariaLabel} max={Math.max(requirements.length, 1)} value={met}>
        <ProgressTrack className='h-1'>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>

      <ul className='flex flex-wrap gap-x-3 gap-y-1' data-slot='password-strength-requirements'>
        {requirements.map((requirement) => (
          <li
            className={cn(
              'flex items-center gap-1 text-xs',
              requirement.met ? 'text-foreground' : 'text-muted-foreground',
            )}
            data-met={requirement.met ? '' : undefined}
            data-slot='password-strength-requirement'
            key={requirement.label}
          >
            {requirement.met ? (
              <CheckIcon aria-hidden='true' className='size-3' />
            ) : (
              <CircleIcon aria-hidden='true' className='size-3 opacity-48' />
            )}
            {requirement.label}
            <span className='sr-only'>{requirement.met ? 'atendido' : 'pendente'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
