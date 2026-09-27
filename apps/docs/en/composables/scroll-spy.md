# useScrollSpy

`useScrollSpy(ids, options)` tracks which heading is on screen. The current one is the last
whose top is above the `line`, a share of the window or `root` container height, 0.2 by
default. The result is `activeId`, `activate(id)` and `measure()`.

<Example name="composables/ScrollSpy" />

## Signature

<SignatureReference :names="['useScrollSpy', 'ScrollSpyOptions']" />

## Behaviour

`activate(id)` marks the element at once and keeps the mark until the scroll settles: a link
click does not jump to a neighbouring heading. `measure()` recomputes the positions after the
content changes. [Toc](/en/components/toc) is built on this composable.
