# Select

Выбор значения из выпадающего списка.

<Example name="select/Basic" />

Передайте варианты в `options` записями `{ value, label }`.

## Установка

```ts install
import { NuiSelect } from '@numior/vue';
```

## Использование

Поменяйте размер, сторону списка и состояния поля.

<Configurator name="NuiSelect" />

Нужен поиск по списку — берите [Combobox](/components/combobox).

## Примеры

### Разбить варианты на группы

Передайте запись `{ label, items }`.

<Example name="select/Groups" />

Вариант с `disabled: true` виден в списке, но выбрать его нельзя, и стрелки его пропускают.

### Выбрать несколько значений

Добавьте `multiple`.

<Example name="select/Multiple" />

Значения приходят массивом в `v-model:values`, а список не закрывается после клика по варианту.

### Хранить в модели объект

Передайте `getKey`.

<Example name="select/Objects" />

Без `getKey` варианты сравниваются по JSON объекта. Если объект приходит с сервера заново и поля
в нём меняются, верните из функции его код.

### Выбрать из дерева

Добавьте вариантам `children`.

<Example name="select/Tree" />

Ветка с выбранным значением уже раскрыта, а с `multiple` у вариантов появляются флажки. Ветку с
`lazy` вместо `children` список загрузит при раскрытии: ответьте на событие `load`, как у
[Tree](/components/tree).

## Доступность

Поле — кнопка с ролью `combobox`, список — `listbox` с вариантами `option`, а дерево — `tree` с
`treeitem`. Как у нативного `<select>`, первые буквы варианта, набранные на закрытом поле, меняют
значение без открытия списка.

<KeyboardReference name="NuiSelect" />

## API

<ApiReference name="NuiSelect" />
