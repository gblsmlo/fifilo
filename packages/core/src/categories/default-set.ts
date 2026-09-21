import { generateEntityId } from '../primitives'
import type { CategoryKind } from './category'
import type { NewCategoryRecord } from './ports'

export type DefaultCategory = {
  icon: string
  kind: CategoryKind
  name: string
}

/**
 * What a workspace starts with so its first entry can be classified. Flat by
 * choice: a subcategory nobody asked for is a hierarchy the user has to undo,
 * and Decision 022 already allows them to add one level themselves.
 *
 * The `kind` is fixed per category (Decision 022), so it is declared here and
 * never derived at runtime.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { icon: 'utensils', kind: 'expense', name: 'Alimentação' },
  { icon: 'house', kind: 'expense', name: 'Moradia' },
  { icon: 'bus', kind: 'expense', name: 'Transporte' },
  { icon: 'heart-pulse', kind: 'expense', name: 'Saúde' },
  { icon: 'graduation-cap', kind: 'expense', name: 'Educação' },
  { icon: 'party-popper', kind: 'expense', name: 'Lazer' },
  { icon: 'shopping-bag', kind: 'expense', name: 'Compras' },
  { icon: 'receipt', kind: 'expense', name: 'Serviços' },
  { icon: 'circle-dashed', kind: 'expense', name: 'Outros' },
  { icon: 'wallet', kind: 'income', name: 'Salário' },
  { icon: 'laptop', kind: 'income', name: 'Freelance' },
  { icon: 'trending-up', kind: 'income', name: 'Rendimentos' },
  { icon: 'circle-dashed', kind: 'income', name: 'Outros' },
]

export const buildDefaultCategories = (
  organizationId: string,
  createdAt: Date = new Date(),
): NewCategoryRecord[] =>
  DEFAULT_CATEGORIES.map((category) => ({
    color: null,
    createdAt,
    icon: category.icon,
    id: generateEntityId(),
    kind: category.kind,
    name: category.name,
    organizationId,
    parentId: null,
  }))
