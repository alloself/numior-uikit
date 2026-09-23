---
title: "Слои на нативном top layer: dialog, drawer, popover, tooltip"
status: accepted
---

## Context

Волна 2a добавляет слои, необходимые для select/combobox, menu и date picker, и закрывает
вопрос плана о наследовании темы overlay от инициатора. Решения согласованы в интервью
2026-09-23.

## Decision

- Слои строятся на нативном top layer. `NuiDialog` и `NuiDrawer` — `<dialog>` с
  `showModal()`: браузер даёт modal focus trap, inert-фон, Esc, `::backdrop` и возврат
  фокуса. `NuiPopover` и `NuiTooltip` — Popover API: `popover="auto"` с light dismiss для
  поповера, `popover="manual"` для подсказки. Teleport и z-index не используются.
- Элементы остаются в DOM инициатора, поэтому тема, density и `dir` наследуются в top layer
  сами; это проверяется e2e диалогом внутри вложенной тёмной зоны.
- Позиционирование — `@floating-ui/dom` (MIT, ~4 КБ) только внутри `useFloating` в
  `@numior/primitives` (offset → flip → shift → arrow, `autoUpdate`, `strategy: fixed`).
  Компоненты о библиотеке не знают; замена движка локальна.
- Триггер поповера и подсказки — слот `trigger="{ attrs, open }"`: `attrs` содержит
  `popovertarget`, `aria-expanded`/`aria-controls` (или `aria-describedby` и обработчики
  pointer/focus/keyboard) и function-ref, поэтому триггером служит любой элемент.
  Композиция из частей доступна через экспорт `usePopover`, `useDialog`, `useFloating`.
- Модель `v-model:open` синхронизируется с нативным состоянием: `beforetoggle` пишет
  light dismiss и нативные открытия обратно в модель; `showModal`/`close` и
  `showPopover`/`hidePopover` вызываются из post-flush watcher после монтирования и
  только при наличии API. Атрибут `open` у `<dialog>` не биндится.
- Движение: `@starting-style` и `transition-behavior: allow-discrete`; выход в top layer
  анимируется там, где есть `overlay`-transition (Chromium). Токен `--nui-backdrop`
  окрашивает `::backdrop`. Пока диалог модальный, `html:has(.nui-dialog:modal)` получает
  `overflow: hidden; scrollbar-gutter: stable`.
- `useColorScheme` — минимальный композабл: чтение/запись `data-nui-theme` на scope,
  `prefers-color-scheme`, опциональный `storageKey`; playground переключает тему через него.
- Стопка модальных диалогов: `useDialog` ведёт модульный стек открытых `<dialog>`; все,
  кроме верхнего, получают `covered` и модификатор `nui-dialog--covered` с прозрачным
  `::backdrop`, поэтому оверлей один и лежит под верхним диалогом (нижние затемнены), а
  Esc и возврат фокуса остаются нативными (добавлено 2026-09-23 по замечанию о вложенных
  модалках).
- Координаты `useFloating` округляются до device pixel: дробный `top`/`left` заставлял
  текст меню защёлкиваться на пиксельную сетку при первой перерисовке (ховер).
- Тесты: jsdom не реализует `showModal`, `showPopover` и `ToggleEvent`, поэтому unit-тесты
  ставят заглушки прототипов через драйверы и проверяют контракт (id, aria, вызовы,
  синхронизацию модели), а поведение (фокус, Esc, backdrop, light dismiss, порядок Tab,
  тема в top layer, axe) проверяется e2e во всех пяти профилях.

## Alternatives Considered

- Teleport + собственный focus trap, scroll lock и dismiss layer (как Radix): больше JS,
  свои баги там, где браузер уже всё умеет, и пробрасывание темы копированием атрибутов.
- Собственный движок позиционирования: недели отладки вложенных scroll-контейнеров,
  transform и fixed-предков; отложено, floating-ui изолирован адаптером.
- CSS Anchor Positioning: нет в Firefox, не входит в матрицу.
- Части `NuiPopoverTrigger`/`NuiPopoverContent`: требуют asChild-механики; могут быть
  добавлены поверх тех же примитивов, когда появятся menu/select.

## Consequences

Проверенная матрица: Popover API и `:popover-open` — Chrome 114, Firefox 125, Safari 17;
`@starting-style` и `allow-discrete` — Chrome 117, Firefox 129, Safari 17.4; наследование
`::backdrop` — Chrome 122, Firefox 120, Safari 17.4. В Chromium повторный Esc без новой
активации закрывает даже `closable=false` (close watcher) — документируется как подсказка,
не запрет. `scrollbar-gutter: stable` уменьшает containing block для fixed на ширину
скроллбара в десктопном Chromium; e2e измеряет край панели относительно fixed-пробы.
Следующая волна 2b: Toast, Alert, Progress, Skeleton на тех же примитивах.
