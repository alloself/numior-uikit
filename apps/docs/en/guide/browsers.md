# Browser support

Which browsers are supported and which platform features the components rely on.

## Supported versions

The components work in the two latest stable versions of each browser:

| Browser         | Where                          |
| --------------- | ------------------------------ |
| Chrome and Edge | Windows, macOS, Linux, Android |
| Firefox         | Windows, macOS, Linux          |
| Safari          | macOS and iOS                  |

Every change is tested in Chromium, Firefox and WebKit, and in phone profiles for Android and
iOS.

## What the components rely on

Dialogs, popovers and themes are built on browser features, not on replacements of their own:

- `<dialog>` and the Popover API open windows and menus in the top layer of the page.
- `@starting-style` and `transition-behavior: allow-discrete` animate opening and closing.
- `light-dark()`, `color-mix()` and relative colors `oklab(from …)` compute theme colors.
- `:dir()` and logical properties mirror the interface for right-to-left text.
- `:has()` and container queries change the layout without JavaScript.

The packages ship no polyfills. If your audience needs older versions, test the components you
use in them.

The build must not replace these functions either: Vite with its default targets rewrites
`light-dark()` and `:dir()` while it minifies CSS. A nested scheme scope then stops changing
colors, and a block with `dir="rtl"` mirrors only when the page language is written right to
left. Set targets that support the functions:

```ts
export default defineConfig({
  build: { cssTarget: ['chrome123', 'firefox125', 'safari17.5'] },
});
```

## Server

The components render on the server without a DOM and hydrate without markup mismatches. The
[SSR and Nuxt](/en/guide/ssr) guide lists what to pass from the server.
