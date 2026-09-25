---
title: "Структура приложения: каркас, верхняя панель и боковая панель"
status: accepted
date: 2026-09-25
---

## Context

Состав 1.0 требует layout и sidebar. Приложениям нужна оболочка с боковой навигацией,
которая на десктопе сворачивается в полосу иконок или уезжает за край, а на телефоне
становится выезжающим ящиком; при этом состояние панели должно быть управляемым снаружи
(роутер, настройки пользователя), а разметка — доступной и SSR-безопасной.

## Decision

- `NuiLayout` владеет состоянием: `v-model:open` (десктоп, по умолчанию раскрыто),
  `v-model:mobile-open` (ящик), признак узкого экрана через `useMediaQuery(mobileQuery)`,
  id панели для `aria-controls` и переключение по Ctrl/Cmd+B (кроме редактируемых полей,
  `shortcut=false` выключает). Контекст `provideLayout` отдаёт это панели и триггеру;
  провайдер-компонентов нет.
- `useMediaQuery` — false-first: до монтирования и на сервере возвращает `false`, после —
  следит за `matchMedia` и переподписывается при смене запроса. Поэтому серверная разметка
  всегда десктопная и совпадает с первым кадром.
- `NuiSidebar` — `aside` с `aria-label`; `collapsible: icon | offcanvas | none` и `side:
  start | end` (порядок через `order`, направление следует за `dir`). Свёрнутая offcanvas
  панель получает `inert` и нулевую ширину, режим `icon` — полосу `railWidth`. На узком
  экране та же панель рендерится внутри `NuiDrawer` (`title ?? label`), и выбор пункта
  закрывает ящик. Панель отдаёт своим частям контекст `rail/mobile`, сторону для тултипов,
  `expand()` и `closeMobile()`.
- Части: `NuiSidebarHeader`/`NuiSidebarFooter` (блоки), `NuiSidebarContent` (`nav`),
  `NuiSidebarGroup` (подпись + `ul` с `aria-labelledby`), `NuiSidebarItem` (`li` с
  `NuiLink` при `href`/`to`, иначе `button`; `NuiRow` для иконки, подписи и бейджа;
  `aria-current="page"` у активного; тултип с подписью включён только в режиме иконок через
  `NuiTooltip disabled`), `NuiSidebarSub` (кнопка с `aria-expanded`/`aria-controls`, панель
  на `grid-template-rows: 0fr → 1fr`, вложенный `ul` `inert` пока закрыт; в режиме иконок
  нажатие сначала раскрывает панель), `NuiSidebarTrigger` (иконки `sidebar`/`menu`,
  `aria-expanded`, `aria-controls`).
- `NuiAppBar` — `header` со слотами `start`/default/`end`, липкий по умолчанию.
- Измерения не хранятся: ширины приходят custom properties `--_sidebar-size`/`--_rail-size`
  от каркаса, переходы ширины и `visibility` идут по токенам движения.

## Alternatives Considered

- Панель через `position: fixed` с отступом контента: ломает вложенные каркасы и демо в
  ограниченной рамке; flex-строка проще и предсказуема.
- Всплывающие подменю в режиме иконок (как у shadcn): отложены; раскрытие панели по
  нажатию покрывает сценарий без второй поверхности.
- Знание о стороне и сворачивании в `NuiLayout`: панель сама несёт `side`/`collapsible`, а
  каркасу достаточно состояния `open`.

## Consequences

`@numior/primitives` получает `useMediaQuery`, `@numior/vue` — `NuiLayout`, `NuiAppBar`,
семейство `NuiSidebar*`, проп `disabled` у `NuiTooltip`, алиасы иконок `sidebar` и `menu`.
Проверка: unit через `LayoutDriver` (rail, offcanvas, шорткат, sub, ящик), SSR-сценарий,
e2e `tests/e2e/layout.spec.ts` (ширины, тултипы в полосе, Ctrl+B, offcanvas, sub, сторона и
RTL, мобильный ящик, axe). Волна 5 базового UI на этом закрыта; дальше — пакет forms и
прототипы тяжёлых модулей.
