import { Button } from '@twincam/ui/components/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@twincam/ui/components/input-group'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { type ComponentProps, useId, useState } from 'react'

type InputGroupInputProps = ComponentProps<typeof InputGroupInput>

export interface PasswordFieldProps extends Omit<InputGroupInputProps, 'type'> {
  /**
   * Rótulo do botão que alterna a visibilidade, lido por tecnologia assistiva.
   * Recebe o nome do campo porque um formulário pode ter mais de uma senha —
   * "Mostrar senha" e "Mostrar confirmação" precisam ser distinguíveis.
   */
  toggleLabel?: string
}

/**
 * Campo de senha com alternância entre oculto e visível.
 *
 * O `InputGroupAddon` vem depois do `InputGroupInput` no DOM porque é o que
 * preserva o comportamento de foco do grupo — invariante do Coss, não estilo.
 *
 * O estado é local por desenho: qual campo está revelado é efêmero e não
 * pertence ao formulário. Trocar `type` mantém o valor no mesmo input, então
 * o React Hook Form continua dono do valor e nada precisa ser re-registrado.
 */
export function PasswordField({ toggleLabel = 'senha', ...props }: Readonly<PasswordFieldProps>) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()

  return (
    <InputGroup>
      <InputGroupInput id={props.id ?? inputId} type={visible ? 'text' : 'password'} {...props} />
      <InputGroupAddon align='inline-end'>
        <Button
          aria-controls={props.id ?? inputId}
          aria-label={visible ? `Ocultar ${toggleLabel}` : `Mostrar ${toggleLabel}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          size='icon-sm'
          type='button'
          variant='ghost'
        >
          {visible ? <EyeOffIcon aria-hidden='true' /> : <EyeIcon aria-hidden='true' />}
        </Button>
      </InputGroupAddon>
    </InputGroup>
  )
}
