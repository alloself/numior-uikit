---
title: "Конвенции компонентов волны 1: примитивы, поле, CSS, иконки"
status: accepted
---

## Context

После основания реализованы токены v2, пакет `@numior/primitives` и первые компоненты:
`NuiButton`, `NuiIcon`, `NuiConfigProvider`, `NuiField` с частями, `NuiInput`, `NuiTextarea`,
`NuiCheckbox`, `NuiRadioGroup`/`NuiRadio`, `NuiSwitch`. Решения ниже согласованы в интервью
2026-09-22 и определяют форму всех следующих компонентов.

## Decision

- Токены: публичный контракт — только семантические `--nui-*`; значения `oklch()` внутри
  `light-dark()`; производные состояния через `color-mix()` от роли; у каждой роли пара
  `-soft`/`-soft-foreground`; density сдвигает всю шкалу контролов и наследуется через
  вложенные темы; размер элемента — `size: sm | md | lg`.
- `@numior/primitives` — headless-пакет (Vue peer, без CSS): контекст поля
  (`provideField`/`useField`/`useFieldControl`), `useCheckedState`, контекст radio-группы,
  реестр иконок (`provideIcons`, `useIcon`, `lazyIcon`, `createNuiConfig`), `useSplitAttrs`,
  `useControlId`. `@numior/vue` потребляет его и объявляет `@numior/primitives` и
  `lucide-vue-next` external в сборке, чтобы injection-ключи существовали в одном экземпляре.
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
  загружаемый по требованию пофайловыми `import()`; переопределение через
  `NuiConfigProvider` или плагин `createNuiConfig`.
- Текстовые поля синхронизируют DOM и модель через локальный `draft`: DOM ведёт при вводе,
  внешние изменения модели записываются обратно, `lazy` откладывает до `change`, `trim`
  применяет Vue при эмиссии и контрол при `change`.
- Следующие волны: overlays (dialog, popover, tooltip, toast с наследованием темы
  инициатора), навигация, представление данных, select/combobox/date/upload/number,
  пакет `@numior/forms`.

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
