import { cn } from '@fifilo/ui/lib/utils'
import { AudioLinesIcon, FileIcon, FileTextIcon, LinkIcon } from 'lucide-react'
import { type PropertyIcon, type PropertyTone, propertyToneClassName } from '../property-catalog'

export type AttachmentType = 'audio' | 'doc' | 'link' | 'pdf'

interface AttachmentTypePreset {
  icon: PropertyIcon
  label: string
  tone: PropertyTone
}

export const attachmentTypeCatalog: Record<AttachmentType, AttachmentTypePreset> = {
  audio: { icon: AudioLinesIcon, label: 'Áudio', tone: 'warning' },
  doc: { icon: FileIcon, label: 'Documento', tone: 'info' },
  link: { icon: LinkIcon, label: 'Link', tone: 'neutral' },
  pdf: { icon: FileTextIcon, label: 'PDF', tone: 'danger' },
}

export interface AttachmentTypeIconProps {
  type: AttachmentType
  className?: string
}

export function AttachmentTypeIcon({ className, type }: Readonly<AttachmentTypeIconProps>) {
  const preset = attachmentTypeCatalog[type]
  const Icon = preset.icon

  return (
    <Icon
      aria-hidden='true'
      className={cn('size-3.5 shrink-0', propertyToneClassName[preset.tone], className)}
      data-attachment-type={type}
      data-slot='attachment-type-icon'
    />
  )
}
