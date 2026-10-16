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
@stylistic остаются в ESLint (Oxlint не разбирает Vue-шаблоны), типы проверяет vue-tsc
(`typeCheck` Vite+ на tsgo не читает `.vue`, поэтому `typeAware`/`typeCheck` выключены),
`@nuxt/test-utils` запускается обычным `vitest` пакета nuxt (с вшитым в Vite+ Vitest он не видит
текущий набор тестов), а `test:nuxt` и `docs:build` не кешируются (под отслеживанием файлов
Vite Task не запускается служебный процесс esbuild). Fallow проверяет ненужный код/зависимости, циклы, архитектурные границы, дубли и сложность. Публичные entry exports сохраняются даже при private workspace; не объявлять все src entry points и не выключать анализ исходников ради зелёного CI.

## Alternatives Considered

- Монолит с общим runtime отвергнут из-за стоимости загрузки и связанности.
- Обёртка над готовыми примитивами или ProseMirror отвергнута в согласованном плане: необходимы собственные ядра.
- Только Oxlint недостаточен для template linting: https://oxc.rs/compatibility.
- Немедленное создание пустых пакетов всех будущих движков затрудняет понимание реальной готовности; roadmap хранит их границы до реализации.

## Consequences

Кнопка и токены доступны без Tailwind и тяжёлых зависимостей. Сборка и проверки воспроизводимы; готовность bootstrap не означает готовность kit 1.0. Собственные ядра требуют отдельных прототипов, корпусных тестов и бюджета поддержки. Fallow findings требуют проверки; никакого автоматического удаления кода в CI.

Релизная автоматизация реализована по @.archcore/semantic-release.adr.md: единая версия библиотек через semantic-release, публикация выключена до полного 1.0.
