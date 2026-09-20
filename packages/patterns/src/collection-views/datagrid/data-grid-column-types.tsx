'use client'

import {
  CalculatorIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  ExternalLinkIcon,
  FingerprintIcon,
  HashIcon,
  Heading1Icon,
  HistoryIcon,
  Link2Icon,
  ListIcon,
  type LucideIcon,
  MailIcon,
  MapPinIcon,
  MousePointerClickIcon,
  PaperclipIcon,
  PhoneIcon,
  SigmaIcon,
  SquareCheckIcon,
  TagsIcon,
  TypeIcon,
  UserIcon,
  UserPenIcon,
  UserPlusIcon,
} from 'lucide-react'
import type { DataGridColumnType } from './types'

export const DATA_GRID_COLUMN_TYPE_ICONS = {
  title: Heading1Icon,
  text: TypeIcon,
  number: HashIcon,
  select: ListIcon,
  'multi-select': TagsIcon,
  status: CircleDotIcon,
  date: CalendarIcon,
  formula: SigmaIcon,
  relation: Link2Icon,
  rollup: CalculatorIcon,
  person: UserIcon,
  file: PaperclipIcon,
  checkbox: SquareCheckIcon,
  url: ExternalLinkIcon,
  email: MailIcon,
  phone: PhoneIcon,
  'created-time': CalendarPlusIcon,
  'created-by': UserPlusIcon,
  'last-edited-time': HistoryIcon,
  'last-edited-by': UserPenIcon,
  button: MousePointerClickIcon,
  id: FingerprintIcon,
  place: MapPinIcon,
} satisfies Record<DataGridColumnType, LucideIcon>

export function DataGridColumnTypeIcon({ type }: { type: DataGridColumnType }) {
  const Icon = DATA_GRID_COLUMN_TYPE_ICONS[type]

  return (
    <Icon
      aria-hidden='true'
      className='size-3.5 shrink-0 text-muted-foreground'
      data-column-type={type}
      data-slot='data-grid-column-type-icon'
    />
  )
}
