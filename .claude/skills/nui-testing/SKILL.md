---
name: nui-testing
description: Write or extend tests for Numior UI - unit tests through component drivers and composable harnesses, SSR scenarios, and Playwright e2e through page objects. Use whenever a test file, driver, harness or page object in this repo is created or changed.
---

# Numior testing patterns

Specs read as scenarios: driver calls plus `expect`. No DOM poking, no `as`, no inline
helper lambdas, no `page.getByTestId` inside specs. Arrow constants everywhere (prototype
stubs that need `this` use method shorthand), every block braced.

## Unit tests for components (`packages/vue/test`)

Driver per component in `test/drivers/<name>.ts`, extending `ComponentDriver`:

```ts
export class ThingDriver extends ComponentDriver {
  protected readonly block = 'nui-thing';

  static mount({ props = {}, modelValue, attrs = {} }: ThingMountOptions = {}) {
    return new ThingDriver(
      mount(NuiThing, {
        props: { ...props, ...(modelValue === undefined ? {} : { modelValue }) },
        attrs,
      }),
    );
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  get emittedValues(): string[] {
    return emittedStrings(this.wrapper, 'update:modelValue');
  }

  async type(text: string): Promise<void> {
    this.control.element.value = text;
    await this.control.trigger('input');
  }
}
```

- Factories are synchronous; anything asynchronous (lazy icons) waits behind
  `await driver.ready()` (see `IconDriver`, `CheckboxDriver`).
- Typed access: `find<HTMLInputElement>()`, `emitted()` filtered by type guards, exposed
  methods through a fixture SFC that holds `useTemplateRef('thing')` and re-exposes them
  (`test/fixtures/InputFocusHandle.vue`, read as `wrapper.vm.focusInput()`).
- Hosts are SFC fixtures, never render functions: `h`, `defineComponent`, `createVNode`,
  `renderSlot` and `{ setup, render }` objects are banned by ESLint in tests too. A scene with
  slot content or several parts is `test/fixtures/<Name>.vue` (template first, props
  destructured, slot markup in its template); the driver maps its options to fixture props.
  Plain text slots may stay strings in `mount(..., { slots: { default: 'Save' } })`.
- No provider fixtures: config comes from `global.plugins: configPlugins(config)`; a nested
  layer is a `provideNuiConfig(...)` call inside the fixture's own script
  (`test/fixtures/NestedConfig.vue`). Components passed into reactive props or config are
  wrapped in `markRaw` (`test/support/router-stub.ts`).
- One driver action awaits exactly one `nextTick()`. If an assertion needs a second tick,
  the component chains renders (a post-flush watcher writes reactive state); fix the
  component, never add a second tick or a helper that hides it. `pnpm test:ticks` fails on
  two consecutive `nextTick()` calls.
- Assert modifiers with `driver.hasModifier('size-sm')`, native state with element getters.
- Spec file `test/<name>.test.ts`:

```ts
it('waits for a commit with the lazy modifier', async () => {
  const input = InputDriver.mount({ modelValue: '', modifiers: { lazy: true } });
  await input.type('abc');
  expect(input.emittedValues).toEqual([]);
  await input.commit();
  expect(input.emittedValues).toEqual(['abc']);
});
```

- Under `vi.useFakeTimers()` Vue skips a bubbled event on an ancestor when the event's
  timestamp equals the listener's attach time (frozen clock). Before dispatching a bubbling
  event through an element that has its own handler, call `vi.advanceTimersByTime(1)` (see
  `MenuDriver.press`).
- Native popover and dialog APIs are stubbed by `TopLayerStubs` (vue) and `installTopLayer`
  (primitives); both dispatch `beforetoggle` and `toggle`.
- Every component with a message catalog gets a scenario «speaks the configured language and a
  prop still wins»: drivers take `config?: NuiConfigOptions` and mount with
  `global: { plugins: configPlugins(config) }` (`test/support/config.ts`); English stays the
  default, so existing assertions keep English texts. Components with a `locale` prop also
  check that the prop, not the config, picks the language.

- Default icons are preloaded by `test/support/preload-icons.ts` (Vitest `setupFiles`) so
  lazy icon imports resolve from cache; a new default alias goes there too, otherwise a
  test file can tear down while lucide is still loading.

- Playwright's `keyboard.type` inserts non-Latin characters as text without `keydown`, so
  typeahead with Cyrillic labels is driven by `locator.dispatchEvent('keydown', { key })`
  from the page object (`NavigationSection.typeInMenu`).
- Keep static `mount()` factories synchronous: fallow cannot follow member accesses through
  an awaited `Promise<Driver>` and reports every getter as unused. When the first render
  needs a post-mount flush (virtualisation measures the viewport after mount and the
  measurement is state by design), expose a single-tick `settle()` and await it in the spec
  (`VirtualHarness`).
- jsdom has no layout: give a scroll container a size with `Object.defineProperty(el,
  'clientHeight', { value })` and dispatch `scroll`; `useVirtualList` re-measures on every
  scroll event, so no internal API is needed (`TreeDriver.setHeight`, `TableDriver.mount({ width, height })`).
- Leftover trees from a failed test share generated ids across apps, so resolve
  `aria-activedescendant` inside the driver's wrapper, never via `document.getElementById`.

## Composable tests (`packages/primitives/test`)

Use `captureSetup(() => useThing(), { layers: [() => provideThing(...)] })` from
`test/harness/capture.ts` (each layer runs in the setup of its own `SetupProbe` level, the
composable runs in the innermost one, since inject only sees ancestors), or a harness class with named getters (`FieldHarness`,
`ControlHarness`). Read state from the captured context, not from attributes.

## SSR

Render with `renderToString` from `@vue/test-utils` (same `props`/`slots`/`global` options as
`mount`), the component itself or a scene fixture in `test/fixtures/ssr/`; no
`createSSRApp({ render })`. VTU stubs `Transition`/`TransitionGroup` by default, so a spec that
asserts their markup sets `config.global.stubs = { transition: false, 'transition-group': false }`.

Add a scenario to `packages/vue/test/ssr.test.ts`: render twice, expect identical markup, no `undefined`, no empty `id`/`aria-describedby`; for fields check
that the label `for` matches the control id and that values render on the server.

## E2E (`tests/e2e`)

- Page objects in `tests/e2e/pages` (`PlaygroundPage`, `FormsSection`): locators, actions,
  typed readers such as `readOutput()`.
- Colors through `expectRgb` (`tests/e2e/helpers/color.ts`); axe through
  `playground.wcagViolations()` after `playground.emulate({ reducedMotion: 'reduce' })`.
- Cover keyboard and tap (`isMobile`), RTL overflow, density steps, then run in Docker.
- An element inside `aria-hidden` has an empty accessible name (the number field steppers), so
  assert its `aria-label` attribute instead of `toHaveAccessibleName`.
- `getByRole(..., { name })` matches substrings (`Узел 1` also finds `Узел 10`); for item
  lookups by label use `exact: true` or filter by an anchored `hasText` RegExp (`TreeSection.item`).
- A pointer click on a stretched-link surface is refused by actionability checks because the
  action intercepts it; use `page.mouse.click` on the target's box after `scrollIntoViewIfNeeded`
  (`DataSection.clickSurface`). Firefox applies `:focus-visible` only after real keyboard
  navigation, so reach a control with `Tab`, not `locator.focus()`, before asserting a ring.
- axe `scrollable-region-focusable`: a scroll container with no focusable content needs
  `tabindex="0"` (the table scroller with `height`); the tree root already has it.
- Type guards come from `packages/primitives/test/support/guards.ts` in every suite (primitives,
  vue and forms tests, e2e): `isString`, `isNumber`, `isBoolean`, `isRecord` and the
  combinators `nullable`, `optional`, `listOf`, `oneOf`, `anyOf`, `shapeOf`, plus
  `parseAs(text, guard, what)` for JSON outputs. A guard claims only what it checks: an output
  type is derived from its guard (`export type TableOutput = Guarded<typeof isTableOutput>`),
  never written beside it, and a check of key presence never stands in for a full type.
  Shared geometry lives in `tests/e2e/helpers/geometry.ts` (`Box`, `boxOf`).
- Drag gestures use `page.mouse` (down, a 4px nudge past the threshold, a stepped move, up)
  from the page object (`SmartFormSection.dragContact`); in jsdom the drivers dispatch
  `PointerEvent`s on the handle and `pointermove`/`pointerup` on `window`, with
  `getBoundingClientRect` defined per row (`TreeDriver`). Mid-drag state (ghost, drop line)
  is asserted through a `whileDragging` callback in e2e and through grab + `ghostText` +
  drop readers in jsdom.
  Hover-only affordances are checked with computed `opacity`, since Playwright treats
  `opacity: 0` elements as visible.
- Measurements taken in `onMounted` or by a resize observer (the table scroller size that
  feeds the row and column windows and the flex columns) happen before a driver can touch
  elements, so the driver defines `clientWidth`/`clientHeight` on the scroller in `mount`
  (`TableDriver.mount({ width, height })`) and dispatches `scroll` to re-measure. Measured values land in
  the DOM directly (`inlineSize` and `translate` in element styles, `--_side-x`/`--_side-y`
  on floating elements), so assert them through element style getters (`rowTransform`,
  `paneOf`, `sideVector`), never through classes.
