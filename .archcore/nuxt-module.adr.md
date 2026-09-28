---
title: "Модуль Nuxt поверх createNuiConfig и app.config"
status: accepted
---

## Context

Гайд SSR обещал, что отдельного модуля Nuxt нет и кит подключается вручную: плагин с
`createNuiConfig`, скрипт схемы через `useHead`, CSS через `css` в `nuxt.config`. Пользователь
потребовал модуль (2026-09-28). План относит `nuxt` к опциональным интеграциям, а требования
1.0 включают Nuxt SSR и гидратацию без ошибок.

## Decision

Пакет `@numior/nuxt` — модуль на `@nuxt/kit` с `configKey: numior` и совместимостью Nuxt 4.
Он не дублирует кит: `packages/nuxt/src/module.ts` регистрирует плагин, а плагин
(`src/runtime/plugin.ts`) вызывает тот же `createNuiConfig`, что и приложение на Vite.

- Опции `numior` в `nuxt.config` только сериализуемые (`locale`, `dir`, `colorScheme`,
  `toasts`, флаги `css`, `components`, `composables`); они попадают в
  `runtimeConfig.public.numior`. Код (словарь `messages`, `translate`, реестр иконок, свой
  компонент ссылки) живёт в `app.config.ts` под ключом `numior`, потому что app config
  бандлится и допускает несериализуемые значения. Плагин читает `locale`, `dir` и `messages`
  через геттеры, поэтому смена значений в app config реактивна и побеждает `nuxt.config`.
- Компоненты и композаблы регистрируются через `addComponent`/`addImports` по реальным
  экспортам `@numior/vue` (и `@numior/forms`, если он резолвится из `modulesDir`):
  имена `Nui*` со `setup`/`render` или функциональные компоненты с `props`, функции `use*`.
  Списки не дублируются вручную; `NuiFormError` и правила форм в автоимпорт не попадают.
  Автоимпорты композаблов идут с `priority: -1`: при совпадении имён (`useLayout` самого Nuxt,
  `useMediaQuery` из `@vueuse/nuxt`) побеждает чужой, без предупреждения о дублях, а композабл
  кита импортируется явно.
- CSS токенов, компонентов и форм добавляется в `nuxt.options.css` при `css: true`. Скрипт
  `colorSchemeScript(storageKey, initial)` уходит в `app.head.script` и ставит сохранённую схему
  или `initial` до первой отрисовки. `htmlAttrs` для `data-nui-theme` не используется: unhead
  владеет атрибутами `<html>` и после гидрации переписал бы значение из хранилища (e2e поймал
  `light` вместо сохранённого `dark`).
- `to` рендерит `NuxtLink`: плагин передаёт его в `createNuiConfig({ link })` импортом из
  `#components`, потому что Nuxt регистрирует `NuxtLink` автоимпортом, а не глобально.
- Пакет собирается Vite lib с двумя входами (`module`, `runtime/plugin`); внешние
  `@nuxt/*`, `@numior/*`, `nuxt/app`, `#components`, `vue`. Типы модуля дополняют `nuxt/schema`
  (`NuxtConfig.numior`, `PublicRuntimeConfig.numior`, `AppConfigInput.numior`).

## Alternatives Considered

- Ручной плагин из гайда остаётся рабочим путём, но не даёт автоимпорта и требует повторять
  CSS и скрипт схемы в каждом приложении.
- `@nuxt/module-builder` отвергнут: пакеты кита собираются Vite, а module-builder тянет
  unbuild и свою конвенцию каталогов.
- Статический список компонентов в модуле отвергнут: он расходится с экспортами при каждом
  новом компоненте.
- Функции и компоненты в `runtimeConfig` невозможны (JSON), поэтому граница между
  `nuxt.config` и `app.config` проходит по сериализуемости.

## Consequences

Проверки: юнит-тест `exports.test.ts` на отбор экспортов; `module.node.test.ts` поднимает
настоящий Nuxt через `loadNuxt({ ready: false })`, устанавливает модуль и читает хуки
`components:extend`/`imports:extend`, CSS, head и плагин; `pnpm test:nuxt` собирает фикстуру
`packages/nuxt/test/fixture` через `@nuxt/test-utils` и проверяет SSR-разметку после `pnpm build`,
потому что фикстура резолвит `dist` пакетов как реальное приложение; e2e-проект `nuxt-chromium`
открывает собранную фикстуру и проверяет гидратацию без предупреждений, тост, переход по
`NuxtLink` и схему из `localStorage`. Гайд SSR описывает модуль; ручной путь упомянут одной
строкой. Пакет private до 1.0, как остальные.
