---
title: "Разработка и проверка основания Numior UI"
status: accepted
---

## Prerequisites

Node 24.15+; проверенная и закреплённая версия 24.21.0 в @.nvmrc. pnpm 10.31.0 через Corepack. Локальный Archcore CLI v0.3.1 совместим с текущими документами; обновление глобального CLI не выполнялось. Для браузерной матрицы нужна поддерживаемая Playwright ОС либо официальный Docker image той же версии.

## Steps

1. Выполнить `nvm install`, `nvm use`, `corepack enable`, `pnpm install --frozen-lockfile` в корне. Системный pnpm может содержать встроенный старый Node; использовать Corepack выбранной версии Node.
2. `pnpm dev` запускает @apps/playground. `/` проверяет автономный CSS, `/tailwind.html` — Tailwind 4. В dev включён source export condition; production импортирует dist.
3. `pnpm build && pnpm docs:dev` запускает RU/EN VitePress с локальным поиском и Vue-примером. `pnpm docs:build` собирает статические страницы с SSR.
4. `pnpm check` включает release:check (SemVer, блокировки, tarballs, dry-run) и проверяет Oxfmt, Oxlint + Vue template ESLint, vue-tsc, Fallow dead-code/dupes/health, Vitest, build, exports/CSS/LICENSE и docs.
5. `pnpm exec playwright install` и `pnpm test:e2e` запускают Chromium, Firefox, WebKit и два мобильных профиля по production-сборке. Для Ubuntu 20.04 использовать Docker: текущий Playwright не поддерживает эту ОС. Проверенный образ — mcr.microsoft.com/playwright:v1.63.0-noble.
6. `pnpm test:coverage` создаёт V8 coverage. `pnpm arch:check` проверяет документы и связи. CI @.github/workflows/ci.yml выполняет quality и browser jobs; release job выключен до готовности 1.0 через NUMIOR_RELEASE_ENABLED. Релизные команды, npm OIDC и правила восстановления: @docs/releases.md.

## Verification

Реализовано только основание: @packages/tokens, @packages/vue с NuiButton, @packages/utilities, @packages/tailwind; документация, playground, конфигурации и CI. Будущие модули перечислены в @packages/README.md; готовность 1.0 не заявляется.

Публичный контракт защищён explicit exports и private manifests; CSS opt-in. Fallow сохраняет public entry exports и использует @numior/source при анализе, не требует заранее собранного dist. Дополнительная entry CSS fixture объясняется HTML-подключением. Все остальные исходники остаются в анализе, disabled rules для маскировки ошибок не вводятся.

На 2026-09-22 браузерная матрица 20/20 прошла в Docker: клавиатура/touch, loading, темы/system/nesting, accent, density, RTL, Tailwind parity и axe на light/dark. Это эмуляция мобильных профилей, а не тест реальных телефонов; axe не заменяет ручную доступность и проверку screen reader.

## Common Issues

- `Unsupported engine`: активировать Node из .nvmrc и Corepack pnpm; не выключать engine-strict.
- Vue compileScript «No fs option»: не удалять TypeScript 5.9.3 override; optional peer TS 7 не совместим с используемым JS compiler API.
- Fallow unresolved CSS до build: сохранить resolve.conditions @numior/source и exports каждого пакета.
- Нет браузеров/старый Linux: install на поддерживаемой ОС или version-matched официальный Playwright image. Не подменять тестовый браузер произвольным установленным Chrome ради отчёта.
- Archcore MCP не зарегистрирован в агенте: документы доступны в .archcore и через archcore mcp. Bootstrap создал базу через init_project; глобальные конфигурации агентов не менялись.