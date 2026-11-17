# TypeScript

Как типы компонентов работают в шаблонах и что настроить в `tsconfig.json`.

## Настройте компилятор

Включите разрешение модулей через поле `exports`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

Пакеты объявляют типы в `exports`, поэтому со старым режимом `node` редактор их не найдёт.
Подойдут и режимы `node16` и `nodenext`.

Типы пакетов проверены с флагами `strict`, `exactOptionalPropertyTypes` и
`noUncheckedIndexedAccess`. Включайте их в своём проекте: типы компонентов с ними не спорят.

## Опишите тип значения

Задайте варианты типом `NuiOptionSource<T>`, и `v-model` примет только значения `T`:

<Example name="guide/Typed" />

Опечатка в `value` или лишний статус теперь подчёркиваются в редакторе. Тип значения так же
выводят `NuiCombobox`, `NuiRadioGroup`, `NuiCheckboxGroup`, `NuiToggleGroup`, `NuiTree` и
`NuiList`.

## Берите значения свойств из констант

Импортируйте константу с тем же именем, что и тип свойства, чтобы не писать строки вручную:

```vue
<template>
  <NuiButton :variant="NuiButtonVariant.Soft" :size="NuiButtonSize.Sm">Сохранить</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiButtonSize, NuiButtonVariant } from '@numior/kit';
</script>
```

Строки `'soft'` и `'sm'` тоже подходят: тип свойства состоит из этих же значений. Константы
удобны, когда значение хранится в данных или приходит из функции.

## Храните набор свойств в объекте

Опишите объект типом `Nui<Имя>Props` и передайте его через `v-bind`:

```vue
<template>
  <NuiButton v-bind="quiet">Отмена</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, type NuiButtonProps } from '@numior/kit';

const quiet: NuiButtonProps = { variant: 'ghost', tone: 'neutral', size: 'sm' };
</script>
```

Такой тип есть у каждого компонента: `NuiSelectProps`, `NuiDialogProps`, `NuiTableProps`.

## Вызовите метод компонента

Получите ссылку на компонент через `useTemplateRef` и вызовите его метод:

<Example name="guide/Focus" />

Методы компонента перечислены в разделе API на его странице.
