---
name: nui-component
description: Author or change a Numior UI component in packages/vue the way this repo requires. Use for any new Nui* component, prop or styling change; covers props destructure, defineModel, BEM with private CSS variables, motion tokens, lazy icons, docs RU/EN, playground and wiring.
---

# Numior component authoring

Read `.archcore/component-authoring.rule.md` and `.archcore/component-conventions.adr.md`
first. Then follow this checklist; every item is required before `pnpm check`.

## Files

`packages/vue/src/<name>/Nui<Name>.vue`, `<name>.types.ts`, `<name>.css`.
Add `@import './<name>/<name>.css';` to `packages/vue/src/styles.css`, export the component
and its types from `packages/vue/src/index.ts`, add the export name to
`scripts/check-artifacts.mjs`.

## Script

The template comes first in every SFC, the script second (`vue/block-order` enforces it).

```vue
<template>
  <div class="nui-thing" :class="[`nui-thing--size-${size}`, { 'nui-thing--invalid': isInvalid }]">
    ...
  </div>
</template>

<script setup lang="ts">
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import type { NuiThingProps } from './thing.types';

defineOptions({ inheritAttrs: false });
const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
} = defineProps<NuiThingProps>();
const model = defineModel<string>({ default: '' });
const split = useSplitAttrs();
const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));
</script>
```

- A control that holds an uncommitted draft (lazy text, a number before blur, custom combobox
  text, an unclamped time) passes its commit to `useFieldControl(props, { commit: () =>
commitDraft() })`; `NuiFormField` runs these commits before a programmatic submit.
- Props interface in `<name>.types.ts`, optional keys typed `| undefined`,
  `extends NuiFieldControlProps` for form controls. A field control passes `label`, `description`
  and `error` into `useFieldControl` and wraps its root in `<NuiFieldFrame v-bind="fieldFrame"
:reserve-error="reserveError">` (`inline` for box controls, `group` for groups), so the texts
  render on the control itself; `NuiField` stays for slots and multi-control fields. Generic components use
  `<script setup lang="ts" generic="T">` and `defineProps<NuiThingProps<T>>()`.
- Never `withDefaults`, runtime prop objects, `PropType`, `as`, `!`, or comments.
- Nothing is typed on trust: when a value's type cannot be proven, change the API instead of
  reading unchecked (form fields bind by selectors `(v) => v.contacts[i]?.name`, the recorded
  path is checked on every read, string paths yield `unknown`).
- Related flags or a pending "plan" become a tagged union `{ kind: … }`, taken and cleared in
  one step (`createIntent().take()`) and read with a `switch` on `kind`.
- A module that holds only types is named `<name>.types.ts`.
- Hot paths (typing, row rendering, dragging, per-change validation) never rescan a collection:
  build a key index once per source change, keep derived values identity-stable while their
  content is the same, cache `Intl.Collator` and formatters.
- Arrow constants for every function (`const onInput = (): void => {...}`); no `function`
  declarations unless an own `this` is needed; helpers without closure state go to module
  level; every `if`/`for` body is braced.
- Blank lines between multi-line declarations, calls, imports and exports (ESLint
  `@stylistic/padding-line-between-statements`); group `<script setup>` into sections:
  props and models, state, derived values, handlers, lifecycle.
- Read DOM state through `useTemplateRef<HTMLInputElement>('input')`, not `event.target`.
- Composables receive destructured props through a getter, as above.
- One action, one render: decide activation and focus targets before the render (handler or
  a plain `watch`), let a `flush: 'post'` watcher only call `focus()`/`showPopover()` or
  write measurements straight into `element.style`/custom properties. Never write reactive
  state from a post-flush watcher. Activate a not-yet-rendered option by id
  (`navigation.setActive(optionElementId(listId, index), { focus: false })`) and reveal it
  in the post-flush step (`navigation.reveal()`).
- Reading direction comes from `useDirection(anchor)`; floating elements get their side as
  `--_side-x`/`--_side-y` from `useFloating`, CSS derives the shift and the arrow from them.

## Texts

- Every user-facing text (button names, empty states, announcements, errors) lives in
  `src/<name>/<name>.messages.ts`: an interface `Nui<Name>Messages` with flat keys and a typed
  literal `export const <name>Messages: NuiMessageCatalog<'<name>'> = { namespace, en, ru }`.
  Register the interface in `src/messages.types.ts` (`NuiVueMessages`); the registry test then asks
  for the catalog and a Russian text for every English one.
- Text props (`label`, `*Label`, `announce`) take no default. Resolve them in the script:
  `const messages = useMessages(<name>Messages, locale?)` and
  `const closeText = computed(() => closeLabel ?? messages.value.close)`; several texts share
  one `texts` computed. A component with a `locale` prop passes its resolved locale; a prop
  forwarded to a child stays `undefined` so the child resolves its own text.
- Parameterised texts are functions of one object (`page: ({ page }) => ...`); counts go through
  `plural(language, count, forms)` with the language of the text. Function props such as
  `pageLabel` keep their signatures and wrap the dictionary when absent.
- Intl texts (month names, segment names, numbers, file sizes) stay in Intl; neutral glyphs
  (`…`, `+N`) are not translated.

## Template and CSS

- Root class `nui-<name>`; parts `nui-<name>__<part>`; modifiers
  `` `nui-<name>--size-${size}` `` for enumerations and `{ 'nui-<name>--invalid': isInvalid }`
  for states. No `data-*` attributes for variants or states.
- Modifiers set private variables (`--_height`, `--_tone`); base rules read them. Native
  state comes from pseudo-classes (`:checked`, `:disabled`, `:focus-visible`).
- The block root and every part with padding or a border declare `box-sizing: border-box`;
  never rely on a page reset. The playground has none, so a missing declaration shows up in
  e2e sizes and screenshots.
- Every state change has `transition`/`animation` via `--nui-duration-fast|normal|slow` and
  `--nui-easing` (`slow` for layout moves such as stacks and layers); infinite animations
  only slow down under reduced motion, and a sweep (skeleton, indeterminate progress)
  leaves the box fully before it re-enters so the loop has no visible seam.
- A prop typed as `Function | false` (or any union with `boolean`) gets a destructure default
  `= undefined`, exactly like tri-state booleans: Vue's Boolean casting turns an absent prop
  into `false` otherwise (`filter` in NuiCombobox).
- A button whose slot holds only `NuiIcon` squares itself (`nui-button--icon-only`, no
  horizontal padding); `:icon-only` forces or disables it. It always needs `aria-label`.
  Every button, icon-only included, shares the press feedback (`scale: 0.97`). Close buttons in cards align their glyph with the first text line
  (`margin-block-start: calc((font-size * line-height - var(--_height)) / 2)`) and with the
  padding edge (negative `margin-inline-end`).
- Everything that reacts to a click shows `cursor: pointer` (buttons, links, options, menu and
  tree items, chevrons, wheel values); disabled → `not-allowed`, drag handles → `grab` /
  `grabbing`, resizers → `col-resize`. No desktop-native `default` on menus and lists; e2e checks
  the cursor of every enabled control in the playground.
- A drag starts only from its handle, never from the whole row or cell: otherwise it fights the
  click (sorting, selection) and text selection.
- An entrance offset starts on the block-start side (`translate: 0 calc(var(--nui-space-1) * -1)`)
  or a `scale` below 1, never below: a box shifted past the end edge of an `overflow: auto`
  container counts as its scrollable overflow and flashes a scrollbar for the whole animation
  (the table's empty state did). Horizontal slides stay within the padding of their scroller.
- A drag ghost never covers its insertion line: it spans only part of the cross axis (a column
  ghost the header band, a row ghost a compact chip at the row start) while the line runs the
  full width or height beside it. The ghost's grip stays under the pointer.
- Focus ring: `outline: var(--nui-focus-ring-width) solid var(--nui-focus); outline-offset:
var(--nui-focus-ring-offset)`. Disabled: `opacity: var(--nui-disabled-opacity)`.
- Logical properties only (`inline-size`, `inset-inline-start`, `padding-inline`).
- Icons through `<NuiIcon alias="check" />`; new aliases go to `IconAlias` in primitives and
  to `default-icons.ts` as `lazyIcon(() => import('lucide-vue-next/dist/esm/icons/<file>.js'))`.

## Wiring

- Playground: add a demo with `data-testid` in `apps/playground/src/*.vue`.
- Docs: examples are real SFCs, one per locale with the same structure and translated
  strings: `apps/docs/examples/ru/<name>/<Example>.vue` and `apps/docs/examples/en/...`
  (a folder with `index.vue` plus sibling files is a multi-file example). Pages
  `apps/docs/components/<name>.md` and `apps/docs/en/components/<name>.md` embed them with
  `<Example name="<name>/<Example>" />`; the docs Vite plugin bundles the component, its
  source and Shiki tokens, and `pnpm docs:check` fails on a missing counterpart, a
  structural RU/EN difference or a `<style>` block. Add both sidebar entries in
  `apps/docs/.vitepress/config.ts`. Never write `vp-raw` demos or `<style>` in the docs.
  API tables are generated: pages embed `<ApiReference name="Nui<Name>" />` (or `:names` for
  a family) and RU/EN descriptions of every prop, model, event, slot and exposed member plus
  the keyboard table live in `apps/docs/api/<name>.ts` as a `DocsMap`; `pnpm docs:check`
  fails on a missing or stale description. A new `use*` composable gets a page in
  `apps/docs/composables/<name>.md` (+ `en/`) with `<SignatureReference :names="[…]" />`
  for the function and its option/result types, and a sidebar entry; the reference check
  fails on a composable without a signature in either locale.
- Tests: follow the `nui-testing` skill (driver, unit spec, SSR scenario, e2e via page object).
- Record architecture changes in `.archcore` and run `pnpm check`, then `pnpm test:e2e`
  (Docker image `mcr.microsoft.com/playwright:v1.63.0-noble` on this host).
