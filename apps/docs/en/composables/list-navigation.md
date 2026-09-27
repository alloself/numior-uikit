# useListNavigation

`useListNavigation(container, options)` gives a composite widget list keyboard support:
arrows, Home, End, PageUp, PageDown, wraparound, typeahead and RTL. In the `roving` mode the
focus moves between items, in `virtual` the `activeId` moves for `aria-activedescendant`.

<Example name="composables/ListNavigation" />

## Signature

<SignatureReference :names="['useListNavigation', 'ListNavigationOptions', 'ListNavigation']" />

## Behaviour

`selector` picks the items inside the container, `scope` limits them to a subtree, `resting`
names the item with `tabindex="0"` at rest. The `onKeydown` and `onFocusin` handlers attach to
the container; `setActive`, `focusNext` and the other methods move the active item from code.
The kit list, tree, menu, tabs and toggle group are built on this composable.
