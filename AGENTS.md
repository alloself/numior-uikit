# Numior UI

Read `.archcore/numior-ui.plan.md`, `.archcore/modular-foundation.adr.md` and
`.archcore/engineering-quality.rule.md` before changing architecture or public APIs.
An accepted plan is not a statement that its features are implemented.

- Write new code; do not copy SaleHub/Ln implementations.
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
