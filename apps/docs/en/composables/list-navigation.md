# useListNavigation

`useListNavigation(container, options)` adds keyboard control to a list: arrow keys, Home,
End, PageUp, PageDown and jumping to an item by typing its first letters. Use it for your own
list, menu or tab bar.

In the `roving` mode focus moves from item to item. In the `virtual` mode focus stays on the
container or an input, and `activeId` changes for `aria-activedescendant`. In RTL ArrowLeft and
ArrowRight swap.

<Example name="composables/ListNavigation" />

## Signature

<SignatureReference :names="['useListNavigation', 'ListNavigationOptions', 'ListNavigation']" />

## Behaviour

`selector` picks the items inside the container, for example `'[role="option"]'`. `scope` is
for nested lists: an item counts only when its closest element matching `scope` is the
container itself. `resting` returns the item Tab lands on while no item is active.

Put `onKeydown` and `onFocusin` on the container. `setActive`, `focusNext` and the other methods
move the active item from code. The Numior UI list, tree, menu, tabs and toggle group are built
on this composable.
