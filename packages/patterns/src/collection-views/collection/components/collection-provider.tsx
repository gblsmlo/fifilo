import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  CollectionDefinition,
  CollectionPreferences,
  CollectionPreferencesChangeDetails,
  CollectionPreferencesChangeReason,
} from '../types'

function haveSamePreferences(
  left: CollectionPreferences | undefined,
  right: CollectionPreferences | undefined,
): boolean {
  return left?.groupBy === right?.groupBy && left?.view === right?.view
}

export interface CollectionProviderProps<TItem> {
  children: ReactNode | ((context: CollectionProviderValue<TItem>) => ReactNode)
  collection: CollectionDefinition<TItem>
  defaultPreferences?: Partial<CollectionPreferences>
  onPreferencesChange?: (
    preferences: CollectionPreferences,
    details: CollectionPreferencesChangeDetails,
  ) => void
  preferences?: CollectionPreferences
}

export interface CollectionProviderValue<TItem> {
  collection: CollectionDefinition<TItem>
  preferences: CollectionPreferences
  setPreferences: (
    preferences:
      | CollectionPreferences
      | ((preferences: CollectionPreferences) => CollectionPreferences),
    reason: CollectionPreferencesChangeReason,
  ) => void
}

export interface CollectionPreferencesContextValue {
  preferences: CollectionPreferences
  setPreferences: CollectionProviderValue<unknown>['setPreferences']
}

const CollectionPreferencesContext = createContext<CollectionPreferencesContextValue | null>(null)

export function CollectionProvider<TItem>({
  children,
  collection,
  defaultPreferences: defaultPreferencesProp,
  onPreferencesChange,
  preferences: controlledPreferences,
}: CollectionProviderProps<TItem>) {
  const [uncontrolledPreferences, setUncontrolledPreferences] = useState<CollectionPreferences>(
    // With no dimension declared through defaultPreferencesProp, it groups by the
    // first one the collection announces — the package has no vocabulary of its
    // own to pick with.
    () => ({
      groupBy: collection.groupings[0]?.id ?? null,
      view: 'kanban',
      ...defaultPreferencesProp,
    }),
  )
  const preferences = controlledPreferences ?? uncontrolledPreferences
  const latestPreferencesRef = useRef(preferences)
  const controlledSnapshotRef = useRef(controlledPreferences)
  const wasControlledRef = useRef(controlledPreferences !== undefined)

  if (!controlledPreferences) {
    latestPreferencesRef.current = preferences
    wasControlledRef.current = false
  } else if (
    !wasControlledRef.current ||
    !haveSamePreferences(controlledSnapshotRef.current, controlledPreferences)
  ) {
    latestPreferencesRef.current = controlledPreferences
    controlledSnapshotRef.current = controlledPreferences
    wasControlledRef.current = true
  }
  const setPreferences = useCallback(
    (
      update:
        | CollectionPreferences
        | ((preferences: CollectionPreferences) => CollectionPreferences),
      reason: CollectionPreferencesChangeReason,
    ) => {
      const nextPreferences =
        typeof update === 'function' ? update(latestPreferencesRef.current) : update
      latestPreferencesRef.current = nextPreferences
      if (!controlledPreferences) setUncontrolledPreferences(nextPreferences)
      onPreferencesChange?.(nextPreferences, { reason })
    },
    [controlledPreferences, onPreferencesChange],
  )
  const value = useMemo<CollectionProviderValue<TItem>>(
    () => ({ collection, preferences, setPreferences }),
    [collection, preferences, setPreferences],
  )
  const preferencesValue = useMemo<CollectionPreferencesContextValue>(
    () => ({ preferences, setPreferences }),
    [preferences, setPreferences],
  )

  return (
    <CollectionPreferencesContext.Provider value={preferencesValue}>
      {typeof children === 'function' ? children(value) : children}
    </CollectionPreferencesContext.Provider>
  )
}

export function useCollectionPreferences(): CollectionPreferencesContextValue {
  const context = useContext(CollectionPreferencesContext)

  if (!context) {
    throw new Error('useCollectionPreferences must be used within CollectionProvider')
  }

  return context
}
