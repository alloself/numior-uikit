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

Модуль — подпуть `@numior/kit/nuxt` единого пакета (2026-11-17, до этого отдельный пакет
`@numior/nuxt`) с `configKey: numior` и совместимостью Nuxt 4. Он не дублирует кит:
`packages/kit/src/nuxt/module.ts` регистрирует плагин, а плагин (`src/nuxt/runtime/plugin.ts`)
вызывает тот же `createNuiConfig`, что и приложение на Vite. Помощники модуля берутся из
`nuxt/kit` (Nuxt переотдаёт `@nuxt/kit`), а `nuxt` у кита — необязательный peer: прямая
зависимость от `@nuxt/kit` добавила бы каждому приложению на Vite 79 пакетов и 81 МБ установки.

- Опции `numior` в `nuxt.config` только сериализуемые (`locale`, `dir`, `colorScheme`,
  `toasts`, флаги `css`, `components`, `composables`); они попадают в
  `runtimeConfig.public.numior`. Код (словарь `messages`, `translate`, реестр иконок, свой
  компонент ссылки) живёт в `app.config.ts` под ключом `numior`, потому что app config
  бандлится и допускает несериализуемые значения. Плагин читает `locale`, `dir` и `messages`
  через геттеры, поэтому смена значений в app config реактивна и побеждает `nuxt.config`.
- Компоненты и композаблы регистрируются через `addComponent`/`addImports` по реальным
  экспортам `@numior/vue`, `@numior/forms` и `@numior/table` (таблица добавлена 2026-09-29) с
  путями кита `@numior/kit`, `@numior/kit/forms`, `@numior/kit/table`: приложение ставит только
  кит, и строгий pnpm отдаёт ему только эти имена. Проверка артефактов держит, что вход кита
  отдаёт те же объекты, что пакет:
  имена `Nui*` со `setup`/`render` или функциональные компоненты с `props`, функции `use*`.
  Списки не дублируются вручную; `NuiFormError` и правила форм в автоимпорт не попадают.
  Автоимпорты композаблов идут с `priority: -1`: при совпадении имён (`useLayout` самого Nuxt,
  `useMediaQuery` из `@vueuse/nuxt`) побеждает чужой, без предупреждения о дублях, а композабл
  кита импортируется явно.
- CSS токенов, компонентов, форм и таблицы (`@numior/kit/theme.css`, `base.css`, `styles.css`,
  `forms/styles.css`, `table/styles.css`) добавляется в `nuxt.options.css` при `css: true`. Скрипт
  `colorSchemeScript(storageKey, initial)` уходит в `app.head.script` и ставит сохранённую схему
  или `initial` до первой отрисовки: класс `nui-theme--<схема>` на `<html>` (с 2026-11-14,
  раньше атрибут `data-nui-theme`). `htmlAttrs` для схемы не используется: unhead владеет
  значениями, которые сам задал, и после гидрации переписал бы схему из хранилища (e2e поймал
  `light` вместо сохранённого `dark`). Свои классы `htmlAttrs.class` unhead меняет по одному,
  поэтому класс схемы рядом с ними сохраняется (тестовое приложение задаёт `class: 'app'`).
- `to` рендерит `NuxtLink`: плагин передаёт его в `createNuiConfig({ link })` импортом из
  `#components`, потому что Nuxt регистрирует `NuxtLink` автоимпортом, а не глобально.
- Сборка кита выпускает два входа модуля (`nuxt/module`, `nuxt/runtime/plugin`); внешние
  `@numior/*`, `nuxt/*`, `#components`, `vue`. Типы модуля дополняют `nuxt/schema`
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
`packages/kit/test/fixture` через `@nuxt/test-utils` и проверяет SSR-разметку после `pnpm build`.
Фикстура — проект воркспейса с зависимостями `@numior/kit`, `nuxt` и `vue`, модуль подключает как
приложение (`modules: ['@numior/kit/nuxt']`) и резолвит `dist` кита; e2e-проект `nuxt-chromium`
открывает собранную фикстуру и проверяет гидратацию без предупреждений, тост, переход по
`NuxtLink` и схему из `localStorage`. Гайд SSR описывает модуль; ручной путь упомянут одной
строкой. Пакет private до 1.0, как остальные.
