# useScrollSpy

`useScrollSpy(ids, options)` tracks which section of the page is being read. Use it to
highlight the current item of a table of contents.

The current heading is the last one whose top has passed the `line`. The line is a share of the
window or `root` container height, 0.2 by default, that is a fifth from the top.

<Example name="composables/ScrollSpy" />

## Signature

<SignatureReference :names="['useScrollSpy', 'ScrollSpyOptions']" />

## Behaviour

`activeId` is the id of the current heading. `activate(id)` makes a section current at once and
keeps it until scrolling ends. So after a click on a contents item the highlight does not jump to
a neighbouring heading.

Call `measure()` when the page content changes. [Toc](/en/components/toc) is built on this
composable.
