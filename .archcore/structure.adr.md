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
  `NuiSidebarGroup` (подпись + `NuiList variant="nav"` с `aria-labelledby`, слот или `items`),
  `NuiSidebarItem` (`NuiListItem`: ссылка через `NuiLink` при `href`/`to`, иначе кнопка;
  `current` → `aria-current="page"`; `badge` → `NuiBadge`; в слоте `nested` — визуальный
  `NuiTooltip` с `anchor` на действие пункта, включённый только в режиме иконок),
  `NuiSidebarSub` (`NuiListItem interactive` с `aria-expanded`/`aria-controls`, в `nested` —
  панель на `grid-template-rows: 0fr → 1fr` с `NuiList variant="nav"`, `inert` и `visibility:
  hidden`, пока закрыт; в режиме иконок нажатие сначала раскрывает панель),
  `NuiSidebarTrigger` (иконки `sidebar`/`menu`, `aria-expanded`, `aria-controls`).
- 2026-09-26: первая версия дублировала строку списка (свой `ul`, своя кнопка-строка, свой
  бейдж) — переделано на `NuiList`/`NuiListItem`. В режиме иконок подписи визуально скрыты
  (clip), а не `display: none`: иначе ссылки и кнопки теряют доступное имя; тултип в полосе —
  визуальная подсказка без `aria-describedby`.
- `NuiAppBar` — `header` со слотами `start`/default/`end`, липкий по умолчанию.
- 2026-11-15 (решение владельца): шапка повторяет сетку тела. Токены `--nui-layout-rail`
  (3.5rem, умолчание `railWidth`) и `--nui-layout-gutter` (`--nui-space-6`, отступ содержимого).
  С `header="full"` над панелью `collapsible="icon"` у стартовой стороны (`panel`, `plain`)
  `NuiAppBar` становится сеткой `рейл | тело | конец`: `start` по центру колонки рейла, тело и
  конец на отступе содержимого; на телефоне панель отступает на тот же отступ. Каркас узнаёт
  панель через `:has()`, поэтому серверная разметка та же. Отвергнуто: прежний блок держал линию
  числами (`-ms-3` против отступа панели, `w-14` вместо ширины рейла, `me-4` + зазор 8 = `p-6`);
  `inset`/`floating` и панель у конечной стороны остаются без сетки — ширина их рейла считается
  внутри `NuiSidebar`.
  Тем же решением панель рядом с меню (`header="inset"`, `.nui-layout__body > .nui-app-bar`)
  отступает на `--nui-layout-gutter`, как содержимое (было 12 px против 24 px текста примеров).
- 2026-11-11: слот `footer` у `NuiLayout`. С `header="full"` подвал идёт после ряда на всю
  ширину, с `header="inset"` — внутри тела под содержимым; своей разметки и стилей у слота нет.
- Измерения не хранятся: ширины приходят custom properties `--_sidebar-size`/`--_rail-size`
  от каркаса, переходы ширины и `visibility` идут по токенам движения.
- 2026-09-28: `variant` расширен значениями `inset` и `floating` (имена shadcn; `panel`
  играет роль его `sidebar`). Оба живут только в CSS: панель получает внутренний отступ
  `--_inset-gap` каркаса, `floating` рисует карточку псевдоэлементом `::before`, а `inset`
  переносит содержимое каркаса в карточку правилом
  `.nui-layout__row:has(> .nui-sidebar--variant-inset) > .nui-layout__body`. Каркас вариант не
  хранит; на узком экране варианты не действуют, потому что панель живёт в ящике.
- 2026-09-28: в полосе иконок `NuiSidebarSub` больше не раскрывает панель, а открывает
  всплывающий список (`use-sidebar-flyout.ts` на `usePopover` manual, `useFloating`
  `right-start`/`left-start` по направлению, `useDelayedOpen` 100/300 мс, `useListNavigation` по
  действиям пунктов). Наведение, нажатие, → / Enter / Space открывают; Esc и ← закрывают и
  возвращают фокус на кнопку; выбор пункта закрывает через `dismiss()` контекста подсписка;
  подсказка кнопки подавлена, пока панель открыта. Панель — `role="group"` с
  `aria-labelledby` на заголовок, кнопка держит `aria-expanded`/`aria-controls`. Дочерние
  пункты получают контекст с `rail = false`, поэтому их подписи видны, а подсказки выключены.

## Alternatives Considered

- Панель через `position: fixed` с отступом контента: ломает вложенные каркасы и демо в
  ограниченной рамке; flex-строка проще и предсказуема.
- Знание о стороне и сворачивании в `NuiLayout`: панель сама несёт `side`/`collapsible`, а
  каркасу достаточно состояния `open`.
- Передача варианта панели в каркас через контекст: запись из `setup` панели происходит после
  сериализации корня каркаса и даёт расхождение класса при гидратации; `:has()` даёт тот же
  результат без состояния.

## Consequences

`@numior/primitives` получает `useMediaQuery`, `@numior/vue` — `NuiLayout`, `NuiAppBar`,
семейство `NuiSidebar*`, проп `disabled` у `NuiTooltip`, алиасы иконок `sidebar` и `menu`.
Проверка: unit через `LayoutDriver` (rail, offcanvas, шорткат, sub, ящик), SSR-сценарий,
e2e `tests/e2e/layout.spec.ts` (ширины, тултипы в полосе, Ctrl+B, offcanvas, sub, сторона и
RTL, мобильный ящик, axe). Волна 5 базового UI на этом закрыта; дальше — пакет forms и
прототипы тяжёлых модулей.
