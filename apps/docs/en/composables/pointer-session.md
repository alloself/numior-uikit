# usePointerSession

`usePointerSession()` runs a drag through shared pointer listeners on the window. On a press a
component calls `begin({ move, up, cancel })` and gets the moves and the release while the
session is open. `end()` closes the session.

The window listeners are added once per page and stay. WebKit recalculates the styles of the
whole document when a pointer listener is added or removed. Shared listeners keep that work out
of every drag of table columns and rows, editor blocks and the time wheel.

## Signature

<SignatureReference :names="['usePointerSession', 'PointerSession', 'PointerSessionHandlers', 'PointerSessionOptions', 'PointerHandler']" />

## Behaviour

`capture: true` gets the events in the capture phase, before the handlers of elements. This is how
the sidebar flyout learns about a press outside its edges through `down`.

A new `begin` replaces the handlers of the open session. The session closes by itself when the
effect scope of the component is disposed.

## Presses inside a root

`createPressTargets()` gives one `onPointerdown` handler for a root. Elements inside get their own
press handlers through `usePressTarget(targets, element, press)` or the ref function
`pressRefOf(targets, press)`. A press travels from the element under the pointer up to the root
and calls each marked handler until the event stops.

This is how table handles and sheet cells catch a press with one listener for the whole grid.

<SignatureReference :names="['createPressTargets', 'usePressTarget', 'pressRefOf', 'PressTargets', 'PressRef']" />
