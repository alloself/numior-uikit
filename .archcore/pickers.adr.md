---
title: "Выбор: модель опций, select, combobox и пагинация"
status: accepted
---

## Context

Волна 3b закрывает select/combobox из формы 1.0 и пагинацию из навигации. Оба списка стоят
на примитиве `useListNavigation` и слоях из @.archcore/navigation.adr.md; пагинация
переиспользует `NuiSelect` для размера страницы. Решения согласованы 2026-09-23.

## Decision

- Общая модель опций в `packages/vue/src/shared/options.ts`: `NuiOption<T>` (`value`,
  `label`, `description?`, `disabled?`, `icon?`) и `NuiOptionGroup<T>`; ключ значения даёт
  `getKey`, по умолчанию строки и числа как есть, объекты — через JSON. Выбор
  инкапсулирован в `useOptionSelection` (плоский список, ключи, выбранные опции в порядке
  модели, toggle, clear) и используется select и combobox.
- Внутренний `NuiListbox` (не экспортируется) рендерит `role="listbox"` с группами,
  опциями `role="option"` (индикатор выбора, описание, disabled), состояниями загрузки и
  пустого списка; плавающая поверхность — модификатор `nui-listbox--floating`, общий для
  обоих потребителей.
- `NuiSelect`: `<button role="combobox" aria-haspopup="listbox">` + listbox в `popover="auto"`
  шириной не меньше триггера (`useFloating` с `size`), roving-фокус по опциям, typeahead на
  закрытом триггере без открытия, `multiple` с подписью `countLabel`, `clearable`, скрытые
  `<input type="hidden">` на каждое значение. Интеграция с `NuiField` через `useFieldControl`
  и `aria-labelledby` из контекста поля.
- `NuiCombobox`: `<input role="combobox" aria-autocomplete="list">` с `aria-activedescendant`
  (виртуальный режим примитива), встроенный фильтр по подписи (`filter` заменяет или
  отключает), `search` на каждый ввод без дебаунса, `loading`/пустое состояние, чипы в
  порядке выбора в `multiple` (отдельный `NuiChip` с `removable`), Backspace удаляет
  последний, клик по полю фокусирует ввод и открывает список. Свои значения — через
  `customValue: (text) => T`, а не boolean: строковую модель нельзя вывести из `T` без
  приведения типов. Список — `popover="manual"`: текстовое поле не может быть invoker'ом
  автопопапа, поэтому закрытие следует за фокусом (`focusout` корня), а `pointerdown` по
  списку не отбирает фокус у поля.
- `NuiPagination`: чистая `paginationRange(page, pageCount, siblings, boundaries)` по схеме
  MUI, страница всегда зажата в `1…pageCount` (в том числе при смене `pageSize`), `href(page)`
  переключает кнопки на `NuiLink` (роутер через `as`), размер страницы выбирается `NuiSelect`,
  компактный режим — `@container (max-width: 28rem)` на самом компоненте.
- `NuiSelect` держит кнопку очистки абсолютно позиционированной рядом с шевроном:
  отступ считается на корне (`--_clear-inset`), а не на кнопке, у которой свои `--_padding`.
- Props с типом «функция или `false`» (`filter`) обязаны иметь destructure-дефолт
  `= undefined`: иначе Vue приводит отсутствующий проп к `false` из-за `Boolean` в runtime-типе.

## Alternatives Considered

- Нативный `<select>` со стилизованным триггером: список опций не держит тему и выглядит
  по-разному в браузерах.
- `popover="auto"` для combobox с программным показом: каждый клик в поле закрывал список
  light dismiss'ом.
- Boolean `allowCustomValue`: невозможно типизировать без `as`.

## Consequences

Select, combobox и меню делят один примитив навигации и одну поверхность списка; таблицы
смогут переиспользовать `NuiPagination` вместе с `pageSizes`. Виртуализация длинных списков
и асинхронная подгрузка страниц опций не входят в эту волну. Проверка: unit через драйверы
`select`, `combobox`, `pagination`, SSR-сценарии, e2e `tests/e2e/pickers.spec.ts`.
