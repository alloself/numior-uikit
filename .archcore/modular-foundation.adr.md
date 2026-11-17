---
title: "Модульное основание и независимость UI от тяжёлых движков"
status: accepted
---

## Context

Kit должен обслуживать небольшие сайты и сложные CMS/CRM/ERP. Проблемы монолитных библиотек: сложная настройка, большой runtime, нежелательные перерендеры. Новый код не копирует SaleHub, чьи API учитываются только при будущей миграции.

## Decision

pnpm workspace, TypeScript strict, ESM, Vue 3.5+ как peer. Основание: отдельные tokens, vue и tailwind (пресет Tailwind 4 на токенах, единственная система утилит; свой пакет `utilities` удалён 2026-09-28); добавлять самостоятельные поведенческие/вычислительные пакеты по мере реализации. Не создавать фиктивные API тяжёлых модулей. CSS подключается явно и объявляется side effect. Tokens — plain CSS (`theme.css`, `base.css`, `accents.css`, `prose.css`), Tailwind 4 opt-in через `@numior/tailwind`. Публичные entry points закрыты exports; импорты чужих src запрещены.

В репозитории packages для библиотек, apps/docs для VitePress RU/EN, apps/playground для исполняемых примеров, tests для межпакетных/browser сценариев. Все пакеты private до полного 1.0, scope @numior — рабочий. Закреплять инструменты и lockfile. Использовать стабильный Node 24.15+; точная версия 24.21.0 закреплена в .node-version и CI. TypeScript 5.9.3 закреплён workspace override: автоматический optional peer TypeScript 7 не предоставляет ts.sys, нужный SFC-компилятору Vue. Это подтверждено ошибкой сборки и её устранением при единообразной версии TypeScript.

Тулчейн — Vite+ (2026-10-16): `vite-plus` с точной версией через catalog в
`pnpm-workspace.yaml`, `vite` — алиас `@voidzero-dev/vite-plus-core`, `vp build` собирает пакеты в
режиме библиотеки, `vp test` (Vitest 5, импорты `vite-plus/test`), `vp lint` (Oxlint) и `vp fmt`
(Oxfmt) настроены в корневом `vite.config.ts`, шаги `pnpm check` идут через `vp run --cache`.
Пробелы Vite+ закрыты своими инструментами, проверки не ослаблены: eslint-plugin-vue и
@stylistic остаются в ESLint (Oxlint не разбирает Vue-шаблоны). Типы проверяет vue-tsc, а
`vp lint` работает с `typeAware` и `typeCheck`: tsgolint (tsgo) не читает `.vue`, поэтому задача
`typecheck` (`scripts/vue-declarations.ts`) вместе с проверкой выпускает декларации `.vue.d.ts` в
`node_modules/.cache/vue-dts`, а `rootDirs` корневого `tsconfig.json` показывает их tsgo; сам
vue-tsc их не читает, `lint` зависит от `typecheck`. Это обход до поддержки Vue в oxc
(oxc-project/oxc#15761), без shim-модулей и `any`. Правило `typescript/consistent-return`
выключено в пользу `noImplicitReturns` tsconfig (так рекомендует typescript-eslint: проверка
компилятора учитывает исчерпывающие `switch`). Строки делятся на символы через `graphemesOf`
(`Intl.Segmenter`), а не распаковкой. Доки — VitePress 2 (v1 несовместим с Rolldown).
`@nuxt/test-utils` запускается обычным `vitest` пакета nuxt (с вшитым в Vite+ Vitest он не видит
текущий набор тестов), а `test:nuxt` и `lint` не кешируются: под отслеживанием файлов Vite Task на WSL2
запуск бинарников из воркспейса (esbuild в Nitro, tsgolint) падает с `spawn EBUSY`
(voidzero-dev/vite-plus#1643). Fallow проверяет ненужный код/зависимости, циклы, архитектурные границы, дубли и сложность. Публичные entry exports сохраняются даже при private workspace; не объявлять все src entry points и не выключать анализ исходников ради зелёного CI.

## Alternatives Considered

- Монолит с общим runtime отвергнут из-за стоимости загрузки и связанности.
- Обёртка над готовыми примитивами или ProseMirror отвергнута в согласованном плане: необходимы собственные ядра.
- Только Oxlint недостаточен для template linting: https://oxc.rs/compatibility.
- Немедленное создание пустых пакетов всех будущих движков затрудняет понимание реальной готовности; roadmap хранит их границы до реализации.

## Consequences

Кнопка и токены доступны без Tailwind и тяжёлых зависимостей. Сборка и проверки воспроизводимы; готовность bootstrap не означает готовность kit 1.0. Собственные ядра требуют отдельных прототипов, корпусных тестов и бюджета поддержки. Fallow findings требуют проверки; никакого автоматического удаления кода в CI.

Релизная автоматизация реализована по @.archcore/semantic-release.adr.md: единая версия библиотек через semantic-release, публикация выключена до полного 1.0.

## Один пакет для приложения: `@numior/kit` (2026-11-17)

Решение владельца: приложение ставит кит одной командой `pnpm add @numior/kit`, а не пакет на каждый
модуль. Внутри репо пакеты остаются (границы, сборки, тесты, fallow-зоны прежние), `@numior/kit`
собирается из них.

- Кит — мета-пакет: зависит от внутренних пакетов (`workspace:*`), каждый вход реэкспортирует свой
  пакет (`export * from '@numior/table'`). Типы — те же декларации пакетов, модули — один экземпляр, а
  под строгим pnpm всё разрешается от пакета кита. Неиспользуемые модули в бандл приложения не
  попадают; растёт только установка.
- Подпути повторяют имена пакетов: корень — `@numior/vue` и `@numior/primitives` (36 общих имён —
  одни и те же объекты), `controls`, `shiki`, `address`, `guards`, `forms`, `table` (`/engine`),
  `spreadsheet` (`/core`, `/xlsx`), `charts` (`/core`), `editor` (= `@numior/editor-vue`),
  `editor-core` (`/view`), `content` (`/table`, `/code`, `/media`), `collaboration` (`/vue`,
  `/spreadsheet`, `/yjs`, `/room`), `offline`.
- CSS: тринадцать исходных пересылок (`styles.css` и `<модуль>/styles.css`, `theme.css`, `accents.css`,
  `base.css`, `prose.css`, `tailwind/theme.css`) — настоящие файлы `src`, работают под `@numior/source`
  без сборки; постатейные пересылки `<модуль>/styles/*.css` сборка выводит из манифеста `styles.css`
  пакета (`scripts/vite-kit-styles.ts`) и под `@numior/source` указывает на них же в `dist`: в репо их
  никто не импортирует.
- Сторонние: `shiki` — зависимость кита (подсветка без отдельной установки), `@vueuse/core` — тоже
  (закрывает peer совместной работы); `yjs` и `tailwindcss` — необязательные peer.
- Модуль Nuxt — подпуть `@numior/kit/nuxt` (пакет `@numior/nuxt` влит в кит), подробности в
  @.archcore/nuxt-module.adr.md; `nuxt` — необязательный peer кита.
- `@numior/mcp` остаётся отдельным пакетом: инструмент разработчика, запускается через `npx`.
- `check-artifacts`: каждый JS-вход кита отдаёт те же имена и те же объекты, что его пакеты; каждая
  CSS-пересылка ведёт к существующему файлу пакета. Справочник доки пропускает фасад.
- Следом: импорты примеров и команды установки доки на `@numior/kit`, подсветка кода без настройки, после слияния Tailwind — плагин Vite и модуль Nuxt, подключающие
  компоненты и их стили по использованию.

