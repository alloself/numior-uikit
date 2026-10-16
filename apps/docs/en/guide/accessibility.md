# Accessibility

Every component passes an axe check in three browsers and on a phone. It is driven from the
keyboard and announces its state to a screen reader. Below is what the kit does itself and
what stays with the app.

## Keyboard

- Composite widgets (list, tree, tabs, menu, toggle group, accordion) keep one tab stop and
  walk with arrows; Home and End go to the edges.
- The key table is in the "Accessibility" section of every component page.
- The focus ring is drawn on `:focus-visible` with the `--nui-focus`, `--nui-focus-ring-width`
  and `--nui-focus-ring-offset` tokens; a loading button keeps its focus.
- `useHotkey` compares the physical key, so Ctrl+K works on a Russian layout too; combos
  without Ctrl and Meta stay inactive inside inputs.

## Names and descriptions

- Form controls link `label`, `description` and `error` through `for`, `aria-describedby`
  and `aria-invalid`; in groups `NuiField` holds a labelled `role="group"`.
- Icon-only buttons need `aria-label`; icons are decorative (`aria-hidden`).
- Built-in names of buttons and empty states come from the dictionary in the configured
  language, see [Localization](/en/guide/localization).

## Announcements

Toasts, form errors, added rows, copied code and upload progress are announced through live
regions: `role="status"` for neutral messages, `role="alert"` for errors.

## Layers

The dialog and the drawer are modal through the native `<dialog>`: the focus is trapped
inside, Escape closes, the focus returns to the button. Popovers and menus use the Popover
API and stay in the DOM of their opener, so they inherit its theme and `dir`.

## Motion

Every transition runs through `--nui-duration-*`; under `prefers-reduced-motion: reduce` the
durations are zero, and infinite animations (skeleton, indeterminate progress) only slow down.

## What the app does

- Without a [Layout](/en/components/layout) places a `NuiSkipLink` as the first element of the
  page; the layout does it itself.
- Gives pages an `h1` heading and skips no levels; `headingLevel` on Collapsible and
  Accordion fits the sections into the outline.
- Checks the contrast of own colours when replacing a `--nui-<role>` and
  `--nui-<role>-foreground` pair.
