# Numior UI

Read `.archcore/numior-ui.plan.md`, `.archcore/modular-foundation.adr.md`,
`.archcore/engineering-quality.rule.md` and `.archcore/component-authoring.rule.md` before
changing architecture, public APIs or components. An accepted plan is not a statement
that its features are implemented. Component and test conventions live in the skills
`.claude/skills/nui-component` and `.claude/skills/nui-testing`.

- Write new code; do not copy SaleHub/Ln implementations. Behaviour composables and utilities
  come from `@vueuse/core` and `lodash-es` where an equivalent with the same behaviour exists
  (`.archcore/dependencies.adr.md` lists the replacements and the kept exceptions).
- SFC block order is `<template>`, then `<script setup lang="ts">` (ESLint `vue/block-order`).
- Props: `defineProps<Props>()` with reactive destructure defaults and `defineModel`;
  never `withDefaults`, runtime prop objects or `PropType`. Tri-state booleans use `= undefined`.
- Arrow functions only (`const f = () => {}`); `function` solely where an own `this` is
  required. No nested function declarations: closure-free helpers live at module level.
  Every block is braced (`curly: all`, `func-style: expression` in Oxlint).
- Leave early: a function or a loop body never ends with an `if` block without `else`, one wrapped
  statement included; the condition is turned into `if (...) { return; }` (`continue` in a loop)
  and a compound condition gets a name. No `else` after `return`
  (`numior/guard-first` and `no-else-return` in ESLint, autofixable).
- Never spread a list into `push`, `unshift`, `splice`, `Math.min`, `Math.max` or
  `String.fromCharCode`: the call throws near 125 000 entries. Push in a `for…of` loop, take
  `min`/`max`/`maxBy` from `lodash-es` (`numior/spread-arguments` in ESLint for package sources).
- Blank lines separate multi-line declarations, calls, imports and exports
  (`@stylistic/padding-line-between-statements` in ESLint); a `<script setup>` reads as
  logical sections (props and models, state, derived values, handlers, lifecycle), not as a
  flat stream of statements.
- No `as` or `!` type assertions anywhere (tests and configs included); `as const` only.
- CSS is BEM (`nui-block`, `nui-block__part`, `nui-block--key-value`, `nui-block--state`)
  inside `@layer components`, with modifiers setting private custom properties; templates carry
  no Tailwind classes. Every declaration a Tailwind utility writes, standard or arbitrary
  (`inline-[40%]`, `gap-x-[0.5em]`), goes into `@apply` with the same computed look
  (`pnpm parity:css`); only the categories `pnpm check:styles` lists stay declarations (custom
  properties, `color-mix` and relative colours, properties and values without a utility, engine
  geometry, border and outline resets). No
  `data-*` attributes and no `[data-…]` selectors anywhere: variants, states, theme, color
  scheme, accent and density are classes.
  Scopes never re-declare theme keys: a nested scheme sets only `color-scheme`, derived keys
  live in `@theme inline` and are read through `--theme()` or utilities, never `var()`.
- Never restyle a component of another package from outside: no selector whose subject is its
  block, part or modifier, no styled own class on its tag; use props, own wrappers or a kit API
  (`pnpm check:styles`).
- Every state change moves through the motion tokens; icons resolve through the alias
  registry and load on demand; a loading button keeps its width and focus.
- No comments in source files; explanations go to docs and Archcore.
- Built-in texts live in `<comp>.messages.ts` catalogs (RU and EN) resolved by `useMessages`;
  text props have no default, a prop wins over the dictionary.
- Tests read as scenarios through drivers (`packages/*/test/drivers`), harnesses and
  Playwright page objects (`tests/e2e/pages`); every component gets unit, SSR, e2e and axe.
- Keep Vue 3.5+, SSR, keyboard access, RTL and light/dark/system themes. Tailwind 4 is required:
  kit styles compile in the CSS entry that loads Tailwind and the `@numior/tailwind` theme.
- Keep public exports explicit, CSS opt-in and heavy engines outside base UI imports.
- Record architecture changes in Archcore; use its MCP tools when available.
- Use Node 24.15+ and pnpm 10.31.0. Install with `pnpm install --frozen-lockfile`.
- The toolchain is Vite+ (`vp`): one root `vite.config.ts` holds fmt, lint (Oxlint), test (Vitest,
  imports from `vite-plus/test`) and run tasks; ESLint covers Vue templates and vue-tsc the types.
- Run `pnpm check` (its steps run through `vp run --cache`) and, for browser behavior, `pnpm test:e2e`.
- `pnpm arch:check` checks Archcore when its CLI is available.
- Do not disable checks globally to hide findings or use `passWithNoTests`.
- Keep packages private until the complete 1.0 release criteria are met.
- One task at a time in the main checkout, through a merge request: never a git worktree or another
  working copy (`git worktree add`, `EnterWorktree`, a clone, `isolation` on agents and
  workflows). A task is one branch from fresh `master`; the owner reviews and merges it, the agent
  never commits, merges or pushes onto `master`, and the next branch starts only after the previous
  one is merged (`.archcore/development-flow.rule.md`, hook `.claude/hooks/git-guard.mjs`).
- Use Conventional Commits; release rules and activation are in docs/releases.md.
- Run `pnpm release:check` for release changes. Never publish as part of local verification.

Current implementation and commands: README.md. Future modules: packages/README.md.
