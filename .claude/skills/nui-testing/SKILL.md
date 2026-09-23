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
  methods through a host component with `useTemplateRef<InstanceType<typeof NuiThing>>`.
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
  (primitives); both dispatch `beforetoggle` and `toggle`. `scrollIntoView` is absent in
  jsdom: stub it in the harness and restore it in `unmount()`.

- Default icons are preloaded by `test/support/preload-icons.ts` (Vitest `setupFiles`) so
  lazy icon imports resolve from cache; a new default alias goes there too, otherwise a
  test file can tear down while lucide is still loading.

## Composable tests (`packages/primitives/test`)

Use `captureSetup(() => useThing(), { wrap: providing(() => provideThing(...)) })` from
`test/harness/capture.ts`, or a harness class with named getters (`FieldHarness`,
`ControlHarness`). Read state from the captured context, not from attributes.

## SSR

Add a scenario to `packages/vue/test/ssr.test.ts`: render twice through `renderMarkup`,
expect identical markup, no `undefined`, no empty `id`/`aria-describedby`; for fields check
that the label `for` matches the control id and that values render on the server.

## E2E (`tests/e2e`)

- Page objects in `tests/e2e/pages` (`PlaygroundPage`, `FormsSection`): locators, actions,
  typed readers such as `readOutput()`.
- Colors through `expectRgb` (`tests/e2e/helpers/color.ts`); axe through
  `playground.wcagViolations()` after `playground.emulate({ reducedMotion: 'reduce' })`.
- Cover keyboard and tap (`isMobile`), RTL overflow, density steps, then run in Docker.
