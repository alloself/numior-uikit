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

Реализованы токены v2, @packages/primitives (контекст поля, checked state, radio-группа,
реестр иконок с ленивой загрузкой, split attrs) и компоненты @packages/vue: `NuiButton`
(variant × tone × size, loading без изменения ширины), `NuiIcon`, `NuiConfigProvider`,
`NuiField` с частями, `NuiInput`, `NuiTextarea`, `NuiCheckbox`, `NuiRadioGroup`/`NuiRadio`,
`NuiSwitch`, слои `NuiDialog`, `NuiDrawer`, `NuiPopover`, `NuiTooltip` на нативном top layer
(@.archcore/overlays.adr.md), `useColorScheme`, а также обратная связь `NuiToaster`/`NuiToast` с
сервисом `useToast`, `NuiAlert`, `NuiProgress`, `NuiSkeleton` (@.archcore/feedback.adr.md). Конвенции — @.archcore/component-conventions.adr.md и
@.archcore/component-authoring.rule.md. Будущие модули перечислены в @packages/README.md;
готовность 1.0 не заявляется.

Публичный контракт защищён explicit exports и private manifests; CSS opt-in: `styles.css`
и `styles/<name>.css`. Fallow сохраняет public entry exports, анализирует CSS-манифест и
использует @numior/source; в Vitest исходники подключаются и для node-окружения
(`ssr.resolve.conditions`, `server.deps.inline`).

Тесты: unit через драйверы и харнессы (`packages/*/test`), SSR через `renderMarkup`, e2e
через page objects `tests/e2e/pages/*` (`foundation.spec.ts`, `forms.spec.ts`, `overlays.spec.ts`, `feedback.spec.ts`),
цвета сравниваются через canvas-пиксель (`tests/e2e/helpers/color.ts`), axe в light/dark под
`reducedMotion: 'reduce'`. Production-сборка playground держит `build.cssTarget`, чтобы
lightningcss не переписывал `light-dark()`, `oklch()` и `color-mix()`.

На 2026-09-22 браузерная матрица прошла в Docker (Ubuntu 20.04 хоста Playwright не
поддерживает): снимок рабочего дерева с `node_modules` монтируется в
`mcr.microsoft.com/playwright:v1.63.0-noble` вместе с каталогом pnpm, запускается
`pnpm test:e2e`. Это эмуляция мобильных профилей; axe не заменяет ручную проверку.

## Common Issues

- `Unsupported engine`: активировать Node из .nvmrc и Corepack pnpm; не выключать engine-strict.
- Vue compileScript «No fs option»: не удалять TypeScript 5.9.3 override; optional peer TS 7 не совместим с используемым JS compiler API.
- Fallow unresolved CSS до build: сохранить resolve.conditions @numior/source и exports каждого пакета.
- Нет браузеров/старый Linux: install на поддерживаемой ОС или version-matched официальный Playwright image. Не подменять тестовый браузер произвольным установленным Chrome ради отчёта.
- Archcore MCP не зарегистрирован в агенте: документы доступны в .archcore и через archcore mcp. Bootstrap создал базу через init_project; глобальные конфигурации агентов не менялись.