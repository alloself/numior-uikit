# Numior UI

Read `.archcore/numior-ui.plan.md`, `.archcore/modular-foundation.adr.md`,
`.archcore/engineering-quality.rule.md` and `.archcore/component-authoring.rule.md` before
changing architecture, public APIs or components. An accepted plan is not a statement
that its features are implemented. Component and test conventions live in the skills
`.claude/skills/nui-component` and `.claude/skills/nui-testing`.

- Write new code; do not copy SaleHub/Ln implementations.
- SFC block order is `<template>`, then `<script setup lang="ts">` (ESLint `vue/block-order`).
- Props: `defineProps<Props>()` with reactive destructure defaults and `defineModel`;
  never `withDefaults`, runtime prop objects or `PropType`. Tri-state booleans use `= undefined`.
- Arrow functions only (`const f = () => {}`); `function` solely where an own `this` is
  required. No nested function declarations: closure-free helpers live at module level.
  Every block is braced (`curly: all`, `func-style: expression` in Oxlint).
- Blank lines separate multi-line declarations, calls, imports and exports
  (`@stylistic/padding-line-between-statements` in ESLint); a `<script setup>` reads as
  logical sections (props and models, state, derived values, handlers, lifecycle), not as a
  flat stream of statements.
- No `as` or `!` type assertions anywhere (tests and configs included); `as const` only.
- CSS is BEM (`nui-block`, `nui-block__part`, `nui-block--key-value`, `nui-block--state`)
  with modifiers setting private custom properties; no `data-*` for variants or states.
- Every state change moves through the motion tokens; icons resolve through the alias
  registry and load on demand; a loading button keeps its width.
- No comments in source files; explanations go to docs and Archcore.
- Tests read as scenarios through drivers (`packages/*/test/drivers`), harnesses and
  Playwright page objects (`tests/e2e/pages`); every component gets unit, SSR, e2e and axe.
- Keep Vue 3.5+, SSR, keyboard access, RTL, light/dark/system themes and optional Tailwind.
- Keep public exports explicit, CSS opt-in and heavy engines outside base UI imports.
- Record architecture changes in Archcore; use its MCP tools when available.
- Use Node 24.15+ and pnpm 10.31.0. Install with `pnpm install --frozen-lockfile`.
- Run `pnpm check` and, for browser behavior, `pnpm test:e2e`.
- `pnpm arch:check` checks Archcore when its CLI is available.
- Do not disable checks globally to hide findings or use `passWithNoTests`.
- Keep packages private until the complete 1.0 release criteria are met.
- Use Conventional Commits; release rules and activation are in docs/releases.md.
- Run `pnpm release:check` for release changes. Never publish as part of local verification.

Current implementation and commands: README.md. Future modules: packages/README.md.
