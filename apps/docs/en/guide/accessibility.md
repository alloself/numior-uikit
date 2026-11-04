# Accessibility

What Numior UI components do for accessibility on their own and what is left to your app.

## Keyboard

- In a list, tree, tabs, menu, toggle group and accordion, Tab stops once and the arrow keys
  move focus between items. Home and End move focus to the first and last item.
- The keys of every component are listed in the Accessibility section of its page.
- The focus ring appears when the user works with the keyboard (`:focus-visible`). The
  `--nui-focus`, `--nui-focus-ring-width` and `--nui-focus-ring-offset` tokens set its colour,
  width and offset.
- A button in the loading state keeps focus.
- `useHotkey` compares physical keys, so Ctrl+K also works on a Russian keyboard layout.
  Shortcuts without Ctrl or ⌘ do not fire while the user types in an input.

## Labels and hints

- Form controls link the label, hint and error to the control through `for`,
  `aria-describedby` and `aria-invalid`, and a screen reader reads them with the field.
- `NuiField` with the `group` prop renders as a `<fieldset>` and its label as a `<legend>`. A
  screen reader announces it as the name of the group.
- Pass `aria-label` to a button that only has an icon. The icons themselves are hidden from
  screen readers with `aria-hidden`.
- Built-in labels such as "Close" and "No data" use the language from your settings, see
  [Localization](/en/guide/localization).

## Announcements

Screen readers announce toasts, form errors, added rows, copied code and upload progress on
their own. Regular messages use `role="status"`, errors use `role="alert"`.

## Dialogs and popovers

`NuiDialog` and `NuiDrawer` open in a native `<dialog>`. While it is open, focus stays inside,
Escape closes it, and focus returns to the button that opened it.

Popovers and menus use the Popover API and stay in the DOM next to the button that opened
them. So they get the same theme and writing direction as that button.

## Animation

All transitions use the `--nui-duration-*` durations. When reduced motion is on in the system
(`prefers-reduced-motion: reduce`), transitions are turned off. Endless animations of the
skeleton and indeterminate progress only slow down.

## What to do in your app

- If a page is built without [Layout](/en/components/layout), put `NuiSkipLink` first on the
  page. `NuiLayout` adds this link on its own.
- Give every page an `h1` heading and do not skip heading levels. The `headingLevel` prop sets
  the heading level of sections in Collapsible and Accordion.
- If you change the `--nui-<role>` and `--nui-<role>-foreground` colours, check the text
  contrast on the new background.
