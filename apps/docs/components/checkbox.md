# Checkbox

`NuiCheckbox` — флажок для согласия или настройки, которую можно включить и выключить. Для
выбора нескольких вариантов из списка возьмите `NuiCheckboxGroup`.

<Example name="checkbox/Basic" />

## Установка

```ts
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/checkbox.css';
```

## Использование

Текст флажка передайте в слот или в `label`, а пояснение под ним — в `description`. В `v-model`
лежит `true` или `false`.

<Configurator name="NuiCheckbox" />

## Примеры

### Набор значений

`NuiCheckboxGroup` выводит флажок для каждого варианта из `options`. В `v-model` лежит массив
выбранных значений в том порядке, в котором их отмечали.

<Example name="checkbox/Group" />

Вариант с `disabled: true` нельзя отметить или снять, но если он уже выбран, то остаётся в
массиве.

### Строкой

С `orientation="horizontal"` флажки встают в строку и переносятся, если не помещаются.

<Example name="checkbox/Horizontal" />

### Частичный выбор

Свойство `indeterminate` показывает прочерк вместо галочки: так флажок «Все регионы» сообщает,
что выбрана только часть списка. Клик убирает прочерк и переключает флажок как обычно.

<Example name="checkbox/Indeterminate" />

## Доступность

Под оформлением лежит нативный `<input type="checkbox">`, поэтому клавиатура и экранные дикторы
работают с ним как обычно. Группа выводится как `<fieldset>`, а её `label` — как `<legend>`.

<KeyboardReference name="NuiCheckbox" />

## API

<ApiReference :names="['NuiCheckbox', 'NuiCheckboxGroup']" />
