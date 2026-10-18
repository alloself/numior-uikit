---
title: "Конвенции компонентов волны 1: примитивы, поле, CSS, иконки"
status: accepted
---

## Context

После основания реализованы токены v2, пакет `@numior/primitives` и первые компоненты:
`NuiButton`, `NuiIcon`, `NuiField` с частями, `NuiInput`, `NuiTextarea`,
`NuiCheckbox`, `NuiRadioGroup`/`NuiRadio`, `NuiSwitch`. Решения ниже согласованы в интервью
2026-09-22 и определяют форму всех следующих компонентов.

## Decision

- Токены: публичный контракт — только семантические `--nui-*`; значения `oklch()` внутри
  `light-dark()`; производные состояния через `color-mix()` от роли; у каждой роли пара
  `-soft`/`-soft-foreground`; density сдвигает всю шкалу контролов и наследуется через
  вложенные темы; размер элемента — `size: sm | md | lg`.
- Слои (2026-10-17): `-soft` смешивается не с `--nui-surface`, а с `--nui-layer-surface`.
  Блок `nui-layer` в `@numior/tokens` переобъявляет soft-токены от `--nui-surface-overlay`,
  `nui-layer--elevated` — от `--nui-surface-elevated`; корни всплывающих поверхностей кита
  (поповер, меню, диалог, плавающий список и дерево, тост, command, панели дат и времени,
  подменю сайдбара) и приподнятая карточка несут этот класс. Без него в тёмной теме заливки
  hover, аватары и мягкие бейджи внутри слоя совпадали с его фоном. Полупрозрачные soft-токены
  отвергнуты: сквозь фон выбранной строки в закреплённой колонке таблицы просвечивало бы
  содержимое.
- `@numior/primitives` — headless-пакет (Vue peer, без CSS): контекст поля
  (`provideField`/`useFieldContext`/`useFieldControl`), `useCheckedState`, контекст radio-группы,
  реестр иконок (`provideIcons`, `useIcons`, `lazyIcon`, `createNuiConfig`), `useSplitAttrs`,
  `useControlId`. `@numior/vue` потребляет его и объявляет `@numior/primitives` и
  `lucide-vue-next` external в сборке, чтобы injection-ключи существовали в одном экземпляре.
  Иконки, нужные одному пакету (редактор), не входят в общий `defaultIcons`: пакет держит свой
  реестр и подключает его в корне компонента через `provideIconDefaults`, где иконки приложения
  из `provideIcons`/`createNuiConfig` побеждают иконки пакета (2026-10-15).
- Алиас иконки типизирован (2026-10-18): алиасы — ключи наборов иконок. В `@numior/primitives`
  лежит пустой интерфейс `NuiIconSets`, `IconAlias` — объединение ключей всех его наборов. Кит
  объявляет набор рядом с реестром (`declare module '@numior/primitives' { interface NuiIconSets
  { kit: typeof defaultIcons } }` в `default-icons.ts`), редактор так же (`editor: typeof
  editorIcons`), приложение — одной строкой со своим реестром. Ключи нигде не повторяются списком,
  а опечатка в алиасе — ошибка типов (прежнее `string & {}` её пропускало). Объявление стоит в
  `.ts`-модуле с реестром, а не в `.d.ts`: расширение должно попасть в выпущенные объявления
  пакета, а `vue-tsc` не копирует ручные `.d.ts`. Реестр — `Partial<Record<IconAlias,
  Component>>`. `NuiIcon` принимает один проп `icon: IconAlias | Component`, как `icon` у кнопки,
  меню и остальных частей кита; отдельный `alias` убран. `useIcon` удалён — им пользовались только
  тесты, `NuiIcon` читает реестр через `useIcons`.
- Native-first: реальные `<input>`, `<textarea>`, checkbox с `role="switch"`; `appearance:
  none`, контрол остаётся в потоке под индикатором. Вид checked/indeterminate берётся из
  псевдоклассов.
- `NuiField` даёт контролу id, `aria-describedby`, `aria-invalid`, `required`, `disabled`
  через provide/inject; явные props контрола перекрывают контекст; `group` рендерит
  `fieldset`/`legend`, контролы внутри группы не адоптируют id поля, а `NuiRadioGroup`
  адоптирует его как корень группы и получает `aria-labelledby` только при наличии подписи.
- Варианты: `variant` (форма) × `tone` (роль) × `size`; BEM-модификаторы задают приватные
  CSS-переменные. Упаковка CSS: манифест `src/styles.css`, плоский `dist/styles.css` и
  `dist/styles/<name>.css` через export `./styles/*.css`.
- Иконки: алиасы `check`, `minus`, `loader`, `chevron-down`, `x`, `search`; дефолт — Lucide,
  загружаемый по требованию пофайловыми `import()`; переопределение через плагин
  `createNuiConfig` для приложения и `provideNuiConfig` в `setup` для поддерева.
  Компонентов-провайдеров в духе React кит не поставляет (2026-09-25: `NuiConfigProvider`
  удалён, конфигурация — только опции плагина и композабл).
- Текстовые поля синхронизируют DOM и модель через локальный `draft`: DOM ведёт при вводе,
  внешние изменения модели записываются обратно, `lazy` откладывает до `change`, `trim`
  применяет Vue при эмиссии и контрол при `change`.
- Следующие волны: overlays (dialog, popover, tooltip, toast с наследованием темы
  инициатора), навигация, представление данных, select/combobox/date/upload/number,
  пакет `@numior/forms`.
- Рендер-эффекты (2026-09-25): post-flush watcher'ы только трогают DOM. `useFloating`
  пишет позицию, размеры, стрелку и сторону (`--_side-x`/`--_side-y`) прямо в элементы и
  ничего не возвращает; `useListNavigation` хранит активную опцию по id и умеет назначить
  её до рендера; таблица пишет `table-layout`, естественные ширины колонок, sticky-смещения
  (`--_sticky-<index>`) и `aria-valuenow` ресайзеров в DOM из `measure()`; индикатор табов
  и размеры шапки таблицы — custom properties на элементе. Направление письма — опция `dir`
  конфига и `useDirection(anchor)`.

### Уточнения после аудита (2026-09-28)

`aria-required` не ставится на `role="group"`: ARIA не допускает атрибут на этой роли, а
обязательность группы чекбоксов выражает подпись поля.

## Alternatives Considered

- Runtime-объекты props ради тристейт-boolean отвергнуты: destructure-дефолт `= undefined`
  даёт тот же результат без `PropType`.
- `data-*` атрибуты для вариантов отвергнуты в пользу BEM-модификаторов.
- Синхронные импорты Lucide отвергнуты: иконки грузятся по требованию.
- Директива `vModelText` в render-функции отвергнута ради `<script setup>`; поведение
  `lazy`/`trim` реализовано явно с локальным `draft`.

## Consequences

Новый компонент добавляет каталог, строку в манифест CSS, экспорт, драйвер и тесты,
страницы docs RU/EN, секцию playground и e2e-сценарий. Правила реализации закреплены в
@.archcore/component-authoring.rule.md. Публичный контракт растёт только через
`packages/vue/src/index.ts`; готовность 1.0 по-прежнему не заявляется.
