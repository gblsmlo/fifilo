# Property catalog

This directory holds reusable, domain-neutral properties. `StatusProperty` and
`PriorityProperty` use closed visual catalogs: icon, label and tone belong to
this package and are not part of the consumers' API.

## Ownership rule

- `packages/core` defines domain values and rules;
- the feature translates domain values into visual presets;
- this package defines and renders icon, label, tone, size and spacing;
- consumers of properties never recreate visual metadata.

**Labels are pt-BR.** The consumer cannot pass a translation, so the language is
this package's decision, and the vocabulary is the same one `apps/web` already
uses in its filters, so that the same state does not get two names.
`property-labels.test.tsx` pins every label.

The catalog imports no feature contract. Adding a new visual preset requires a
change in this package, a focused test and a story.

## API

```tsx
<StatusProperty readOnly value='inProgress' />
<PriorityProperty readOnly value='high' />
```

Every property uses `badge` as its default surface. To compose the same
icon + label unit inside cards, cells, headers or other patterns without the
resting fill, use `plain`:

```tsx
<StatusProperty readOnly value='inProgress' variant='plain' />
<AssignedProperty options={people} readOnly value={assigneeId} variant='plain' />
```

Both have the same padding — same inset, same radius, same text weight. What
changes is when the fill appears: `badge` starts filled, `plain` holds the fill
back until the pointer arrives, and only when the surface is clickable. In
`plain` the pill is drawn outside the box, so the value sits where it would sit
without it: hover moves neither the text nor the row width.

The variant changes the surface only. Catalog, content, accessibility and
editable behavior keep belonging to the Property.

## The trigger

`PropertyTrigger` is the surface when it is clicked: the same `badge` or
`plain`, now as a button and already contained within the row width. It opens
nothing — it serves as `render` for a `Select`, `Combobox` or `Popover` trigger,
which remains the one controlling the opening:

```tsx
<SelectPrimitive.Trigger
  aria-label={accessibleLabel}
  render={<PropertyTrigger muted={value === null} variant={variant} />}
>
  <StatusPropertyContent preset={selectedOption} />
</SelectPrimitive.Trigger>
```

`PropertySurface` remains the reading surface, the `span` of whoever cannot
write. A new property never reassembles either of them by hand.

When editable, the consumer provides only state and mutation:

```tsx
<StatusProperty value={status} onValueChange={setStatus} />
```

A period is one property, `DateRangeProperty`, and not two `DateProperty` side
by side: a start with no end and an end with no start are states of the same
thing, and splitting them makes the row show two empty pills where there is no
period at all.

The value is the calendar's own `DateRange` (`react-day-picker`), not a string:
whoever persists ISO converts at the boundary, as the rest of the domain already
does with dates.

```tsx
<DateRangeProperty ariaLabel='Período' value={range} onValueChange={setRange} />
```

Tag collections use `TagsProperty`. The consumer provides only options,
selection and callbacks; search, chips and suggested creation belong to the
Property:

```tsx
<TagsProperty
  ariaLabel='Tags'
  options={availableTags}
  value={selectedTagIds}
  variant='plain'
  onCreate={createTag}
  onValueChange={setSelectedTagIds}
/>
```

Remote catalog, authorization and persistence stay in the feature's adapter.

A feature may restrict the available presets without redefining their
presentation:

```tsx
<StatusProperty
  value={status}
  values={['todo', 'inProgress', 'done', 'canceled']}
  onValueChange={setStatus}
/>
```

## Status presets

| Preset | Label | Icon |
| --- | --- | --- |
| `backlog` | Backlog | Circle Dashed |
| `todo` | Todo | Circle |
| `inProgress` | In Progress | Circle Dot |
| `review` | Review | Circle Dot Dashed |
| `done` | Done | Circle Check |
| `canceled` | Canceled | Circle Slash |
| `blocked` | Blocked | Circle Minus |

## Priority presets

| Preset | Label | Icon |
| --- | --- | --- |
| `no_priority` | No priority | More Horizontal |
| `urgent` | Urgent | Badge Alert |
| `high` | High | Signal High |
| `medium` | Medium | Signal Medium |
| `low` | Low | Signal Low |

## Row with a visibility preference

`PropertyCollection` composes a collection's property row with a `…` trigger
that lists the catalog of that collection so the user can add or remove
properties from the row. The registry — which properties exist, their order and
which are default — belongs to the consumer; turning one on or off does not
reorder, the position follows the catalog order. A visible, empty property shows
its own fill affordance; hidden, it is omitted.

```tsx
<PropertyCollection
  ariaLabel='Propriedades do registro'
  items={[
    {
      defaultVisible: true,
      icon: CircleDotIcon,
      id: 'status',
      label: 'Status',
      render: () => <StatusProperty … variant='plain' />,
    },
    { icon: TagIcon, id: 'tags', label: 'Etiquetas', render: () => <TagsProperty … /> },
  ]}
  onVisibleChange={saveViewPreference}
/>
```

Visibility is a preference of the view, not of the property: persisting the
user's choice is the consumer's responsibility (`visible`/`onVisibleChange`).

## Attachment row

`AttachmentsProperty` is the row; `AttachmentProperty` is each attachment inside
it — a file or link of the record, with a tonal icon from `type`, a truncated
label and the removal `×`, in the same anatomy as the `TagsProperty` chip.
`anchor` and `download` decide how the destination opens, not the affordance on
the right: a download icon there would compete with the `×` for the same corner.

```tsx
<AttachmentsProperty
  action={{ icon: PaperclipIcon, label: 'Anexar arquivo', onSelect: openPicker }}
  ariaLabel='Arquivos do registro'
>
  <AttachmentProperty
    action='download'
    href='#'
    label={file.name}
    onRemove={() => remove(file.id)}
    removeLabel={`Remover ${file.name}`}
    type='pdf'
  />
</AttachmentsProperty>
```

The content arrives by composition, not from a catalog of options as in
`TagsProperty`: an attachment is born from an upload or a dialog, not from a
list to pick from. Each item is an anchor, so destination, `target`, `rel` and
authorization stay with the consumer.

**The path to adding lives in the row itself**, as a chip next to the
attachments — it is always in sight, never behind the `…`. The two `…` would
hold different things: in `PropertyCollection` it holds visibility, which is an
adjustment for someone who already has something to see; here it would hold the
main command, and in an empty row that would leave the initial state with no
affordance at all. With attachments in the row the chip collapses into a `+`,
keeping the name only in the accessible label. Without `action` the row is
read-only, which is the state of whoever lists attachments without being able to
attach them.

**There is a single trigger**, like the `+` of `TagsProperty` — that is why
`action` is singular. Two collapsed triggers become two identical `+` side by
side, which do not say which one adds what. Rows that accept different things
are different rows, each with its own label.

## Feature adapter

Domain values need not match the presets. The feature keeps an explicit, typed
translation:

```ts
const taskStatusPresetByValue = {
  pending: 'todo',
  in_progress: 'inProgress',
  completed: 'done',
  canceled: 'canceled',
} as const
```

That adapter is the feature's domain responsibility and may be wrapped by a
local component when it also integrates mutation, authorization or state.

## API that is not allowed

Consumers do not pass:

- icon components;
- labels or alternative translations;
- color, size or spacing classes;
- whole option objects.

If a use case cannot be represented by an existing preset, the catalog must be
widened deliberately. Never create a parallel definition in the consumer.
