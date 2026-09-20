# Collection views

`CollectionToolbar` is the visual authority for entity and collection toolbars.
The `collection-views` package owns the container, the groups and the
compositional controls. Do not create a parallel pattern beside it.

## Grouping carries no domain vocabulary

`CollectionDefinition.groupings` is an array of dimensions named by the
consumer — each one with `id`, `label`, `options` and `getGroupId`. The package
projects any declared dimension; it assumes no `status`, no `assignee` and no
other name.

`CollectionPreferences.groupBy` accepts `null`: that is the ungrouped
collection, which `ListView` knows how to render — a flat list, with no header,
no collapsing and no per-group count. The Kanban is grouping by definition (each
column is a group), so `projectCollection` throws on `null` instead of returning
zero columns.

## The two outlet modes

`CollectionViewMode` is `kanban` or `list`, and `CollectionViewOutlet` is the
only place that decides which one enters. Both receive a render function per
item. The mode label belongs to the consumer: the package does not name a mode
in the interface.

## Anatomy

| Region | Content | Ownership |
| --- | --- | --- |
| Presets | active preset, label, record count and query | `PresetsMenu`; list and state in the consumer |
| Display | single trigger, active filter count, clear filters and save preference | `ViewSettingsMenu`; sections and state in the consumer |
| Action | insertion of the current entity | `Action`; permission and callback in the consumer |

Display and filtering are not two neighbouring triggers: they are sections of a
single menu, declared with `ViewSettingsSection`.

Every trigger reuses `ToolbarButton`, `Button` and `Menu`. No new button
primitive is needed. Icon, density and trigger anatomy belong to the package;
contextual labels, content, state, permission and effects stay in the consumer.

## How to organize the sections

### Display

- `Layout` (the modes the collection offers) and `Density`.
- `Grouped by`: the dimensions declared in `CollectionDefinition.groupings`,
  plus `No grouping` when the view offers the flat list — the package does not
  fix which ones exist. A collection whose grouping is fixed does not compose
  the submenu: a single choice is no choice.
- Sorting, visible fields and card details enter as additional submenus only
  when the collection offers those capabilities.
- There is no ready-made composition tied to `CollectionProvider`. Each consumer
  assembles its sections from `ViewSettingsSection` and the native menus
  (`MenuRadioGroup`, `MenuSub`), reading and writing `useCollectionPreferences()`
  directly.

### Filters

- One submenu per property. A single-value filter uses `FilterRadioSubmenu`,
  which already carries the semantics of "all".
- Simple options use a checkbox or a radio according to cardinality.
- The active count shows in the trigger, and only it — layout and sorting are
  view state, not filters.
- `Clear filters` is a common footer action, fixed by the package.
- Rich fields and forms stay in a `Popover`, never in a `Menu`.

### Action

- It represents the main insertion of the entity.
- The package fixes the visual behavior and the action carries no icon.
- The consumer provides label, callback and disabled state, and decides whether
  the action should be omitted by permission.

## Public API

- `CollectionToolbar` accepts `startSlot`, `endSlot` and free composition
  through `children`.
- `CollectionToolbarGroup` organizes additional groups when free composition is
  needed.
- `ViewSettingsMenu` fixes the single trigger, the active filter count in the
  label, the clear footer and the save-preference footer; the consumer provides
  the sections, the state and the callbacks.
- `ViewSettingsSection` names a division inside that menu.
- `FilterRadioSubmenu` fixes the single-value filter submenu, including the
  "all" option; the consumer provides the options and what each one means.
- `PresetsMenu` fixes a trigger with the same visual weight as the other menus,
  with label, count badge and a popup aligned to the left slot; the consumer
  provides the saved presets and the accessible description of the count.
- `Action` fixes the primary button without an icon; the consumer provides
  label, callback and disabled state.

## Pagination

`CollectionPagination` is the visual authority for a collection's pagination:
first, previous, `page / total`, next and last, with the summary of the visible
range (`1–25 de 57`) when `total` and `pageSize` are known. The consumer
provides `label` in the collection's vocabulary, the current page starting at 1
and `onPageChange` with the destination page; it also decides when to show it.
No feature draws `Anterior`/`Próxima` by hand.

Features consume this composition exclusively through the
`@fifilo/patterns/collection-views` subpath.
