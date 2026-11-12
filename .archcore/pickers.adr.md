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
- По ключу, а не по ссылке, сравнивают значения все группы выбора: `NuiCheckboxGroup`,
  `NuiToggleGroup`, `NuiRadioGroup` и `NuiMenuRadioGroup` (у последних двух `getKey` и ключ
  в контексте группы с 2026-11-12). Причина: `ref` отдаёт объект модели реактивным прокси, и
  сравнение по ссылке с исходным объектом в `value` радиокнопки не находило выбранную.
  `getKey` у радиогрупп получает только определённые значения (`NuiOptionKey<NonNullable<T>>`):
  модель группы без выбора (`ref<Warehouse>()`) выводит `T` вместе с `undefined`, и функция
  ключа с параметром `Warehouse` иначе не проходила проверку типов; модель `T | undefined`
  отвергнута — она ломала обработчики `update:modelValue`, ждущие `T`.
- Выпадающий список — публичный `NuiList` в варианте `floating` (2026-09-25: отдельный
  внутренний `NuiListbox` удалён как дубль). Список рендерит `role="listbox"` с группами
  `{ label, items }`, пунктами `role="option"`, состояниями загрузки и пустого списка;
  владелец передаёт `keyboard=false`, `activeId` для виртуального фокуса и `v-model`, а
  корень-поповер с рамкой и тенью держит `overflow: hidden`, внутренний `ul` скроллится,
  поэтому скроллбар не выходит за скруглённые углы.
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

- Общая обвязка списка в поповере — `useListboxSurface` (2026-09-25): элемент списка через
  `useTriggerElement`, `usePopover` (`auto`/`manual`), `useFloating` с `matchWidth`,
  `fitHeight` и опциональным `maxBlockSize`, `useListNavigation` по `[role="option"]` с
  покоем на выбранной опции и активация опции под курсором. `NuiSelect`, `NuiCombobox` и
  `NuiTimeField` держат только свои обработчики клавиш и фокуса.
- Открытие списка (2026-09-25): активная опция назначается в обычном watcher по `open`
  (select и time field — покой на выбранной или первая/последняя по клавише, combobox — по
  id первой доступной опции отфильтрованного списка), а post-flush watcher только
  показывает поповер, прокручивает к активной (`navigation.reveal()`) и фокусирует её.
  Уход курсора со списка возвращает подсветку на выбранную опцию (`restActive`).
- Группы `NuiList` рисуются заголовком секции, отступом пунктов (`--_indent`) и
  разделителем между группами; во всплывающем списке отступ меньше.
- Дерево в селекте (2026-09-30). Отдельного tree-select нет: `NuiSelect` распознаёт
  вложенные `options` (запись с `children` или `lazy`) и рендерит `NuiTree
  variant="floating"` вместо `NuiList` в том же поповере `useListboxSurface` (`usePopover` +
  `useFloating`); навигация дерева своя, поэтому фокус при открытии уходит корню дерева с
  `aria-activedescendant`, триггер несёт `aria-haspopup="tree"`, Tab и выбор закрывают, Enter
  в `multiple` закрывает через capture-обработчик, чтобы дерево не переключило отметку,
  typeahead на закрытом триггере в режиме дерева выключен. `multiple` — дерево `checkable` с
  каскадом; при открытии раскрываются предки выбранных узлов (`ancestorValuesOf`), `load`
  пробрасывается. Модель записи одна: `NuiOption` получил `children`, `icon` допускает
  `false`, `flattenOptions` спускается в `children`, поэтому подпись выбранного вложенного
  узла берётся из общего `useOptionSelection`. В `floating` дерево держит строки 2rem,
  скроллится корнем, а выбранный узел без чекбокса показывает галочку в конце, как опция.

### Уточнения после аудита (2026-09-28)

Скрытые `input[name]` select и combobox получают `disabled` вместе с контролом. Кнопка
удаления `NuiChip` стоит в порядке табуляции (`removeTabbable`); combobox выводит её из
порядка, потому что удаляет чипы с клавиатуры из поля.

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
