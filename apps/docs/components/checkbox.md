# Checkbox

Флажок для согласия или настройки.

<Example name="checkbox/Basic" />

Подпись передайте в слот, а пояснение и ошибку — в `description` и `error`, как у
[Field](/components/field).

## Установка

```ts
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/kit';
```

## Использование

Поменяйте размер, состояния и пояснение флажка.

<Configurator name="NuiCheckbox" />

## Примеры

### Выбрать несколько вариантов

Передайте варианты в `options` группы `NuiCheckboxGroup`.

<Example name="checkbox/Group" />

В `v-model:values` группы лежит массив выбранных значений. Вариант с `disabled: true` нельзя отметить или
снять, но если он уже выбран, то остаётся в массиве.

### Поставить флажки в строку

Задайте `orientation="horizontal"`.

<Example name="checkbox/Horizontal" />

Флажки, которые не поместились в строку, переносятся на следующую.

### Отметить часть списка

Включите `indeterminate`, когда выбраны не все.

<Example name="checkbox/Indeterminate" />

## Доступность

Под оформлением стоит нативный `<input type="checkbox">`, поэтому флажок попадает в порядок
табуляции и в данные формы. Группа выводится как `<fieldset>`, а её `label` — как `<legend>`.

<KeyboardReference name="NuiCheckbox" />

## API

<ApiReference :names="['NuiCheckbox', 'NuiCheckboxGroup']" />
