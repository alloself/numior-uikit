# Button

`NuiButton` is a native `<button>` styled along two axes. `variant` picks the shape:
`solid`, `soft`, `outline`, `ghost`, `link`. `tone` picks the semantic role:
`primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`.
The default is `solid` + `primary`. Each role reads its `--nui-<role>` tokens, so a
runtime accent change affects every variant at once.

<Example name="button/Basic" />

`@numior/vue/styles.css` loads the styles of every component; `@numior/vue/styles/button.css`
loads only the button. CSS is never imported from JavaScript automatically.

## Sizes

`size` picks the `sm`, `md` or `lg` step inside the current scale; `data-nui-density`
shifts the whole scale. Heights are 2 / 2.5 / 3rem in `comfortable` and 1.75 / 2 / 2.5rem
in `compact`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton size="sm">Small</NuiButton>
  <NuiButton>Default</NuiButton>
  <NuiButton size="lg">Large</NuiButton>
</div>

## States

`disabled` prevents activation. `loading` swallows presses too but keeps the button
focusable: instead of `disabled` it gets `aria-disabled="true"` and `aria-busy="true"` and
cancels the click, so a pressed submit button keeps focus and the form never submits twice.
The content fades out with `opacity` and the `loader` icon from the registry sits centred on
top, so the button keeps its width. `type` defaults to
`button`, so a button inside a form never submits it by accident; `submit` and `reset`
are available.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton disabled>Disabled</NuiButton>
  <NuiButton loading>Saving</NuiButton>
</div>

## Icon only

A button whose slot holds only a `NuiIcon` becomes square by itself: the width equals the
step height, horizontal padding is removed and the content is centred. `icon-only` forces
the mode and `:icon-only="false"` disables it. Such a button needs an `aria-label`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton aria-label="Close"><NuiIcon alias="x" /></NuiButton>
  <NuiButton variant="outline" tone="neutral" size="sm" aria-label="Close"><NuiIcon alias="x" /></NuiButton>
  <NuiButton variant="ghost" tone="neutral" size="lg" aria-label="Close"><NuiIcon alias="x" /></NuiButton>
</div>

```vue
<NuiButton variant="ghost" tone="neutral" aria-label="Close">
  <NuiIcon alias="x" />
</NuiButton>
```

## Accessibility

The component stays a native button: keyboard, focus and screen readers work without
extra JavaScript. The focus ring uses `--nui-focus`. A button without visible text
needs an accessible name, such as `aria-label`. In the `light` and `dark` themes the
`solid`, `soft`, `outline`, `ghost` and `link` variants pass the automated axe contrast
scan in the playground; that does not replace a manual review.

## API

<ApiReference name="NuiButton" />

The default slot is the button content. Native attributes, classes and event listeners
reach the `<button>` element. Styling follows BEM: block `nui-button`, elements
`nui-button__content`, `nui-button__loader`, `nui-button__spinner`, modifiers
`nui-button--variant-soft`, `nui-button--tone-error`, `nui-button--size-sm`,
`nui-button--icon-only` and `nui-button--loading`. Modifiers set private CSS variables (`--_tone`, `--_height`)
that the remaining rules read, so a custom variant is just another modifier class.
