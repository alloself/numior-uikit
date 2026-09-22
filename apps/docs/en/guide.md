# Getting started

This is a working foundation, not a finished UI kit release. Packages are private
and currently available inside the workspace. Archcore records the full editor,
grid, offline and other module roadmap; these features are not implemented yet.

## Local development

Use Node 24.15+, with pnpm 10.31.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Docs: `pnpm build && pnpm docs:dev`. Checks: `pnpm check`.
Browsers: `pnpm exec playwright install`, followed by `pnpm test:e2e`.

## Component and explicit styles

```vue
<script setup lang="ts">
import { NuiButton } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';
</script>

<template>
  <NuiButton>Save</NuiButton>
</template>
```

<div data-nui-theme="light" style="padding: 1rem">
  <NuiButton>Save</NuiButton>
</div>

`variant`: `primary | secondary | ghost`. `type` defaults to `button`; `submit`
and `reset` are supported. `disabled` prevents activation. `loading` disables the
button and sets `aria-busy`; the slot provides its label and indicator. Native
attributes, events and classes reach the button. Controls without visible text
need an accessible name, such as `aria-label`.

## Current verification

Native button activation and blocking, DOM-free package import, exported artifacts,
CSS and declaration builds, theme/accent/density switching, RTL, optional Tailwind
integration and an axe scan of the playground. These checks are not WCAG
certification for the future kit or a substitute for real mobile device testing.
