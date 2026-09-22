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

Components are styled along two axes: `variant` picks the shape and `tone` the
semantic role, while `size` picks a step inside the current density. Details and
live examples live in the Components section, starting with the
[button](/en/components/button). Native attributes, events and classes reach the
root element. Controls without visible text need an accessible name, such as
`aria-label`.

## Current verification

Native button activation and blocking, DOM-free package import, exported artifacts,
CSS and declaration builds, theme/accent/density switching, RTL, optional Tailwind
integration and an axe scan of the playground. These checks are not WCAG
certification for the future kit or a substitute for real mobile device testing.
