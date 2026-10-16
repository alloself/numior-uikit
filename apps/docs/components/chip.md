# Chip

`NuiChip` — токен значения: выбранный тег, фильтр или получатель. Чипом управляет
пользователь: его можно убрать, тот же чип показывает выбранное в `NuiCombobox`. Состояние,
которое только сообщается, — [Badge](/components/badge).

<Example name="chip/Basic" />

## Установка

```ts
import { NuiChip } from '@numior/vue';
import '@numior/vue/styles/chip.css';
```

## Использование

<Configurator name="NuiChip" />

## Примеры

### Удаляемые фильтры

`removable` добавляет кнопку удаления с событием `remove`; `removeLabel` называет, что именно
убирается.

<Example name="chip/Removable" />

### Размеры и недоступность

`size="sm"` подходит для таблиц и списков, `disabled` приглушает чип и выключает удаление.

<Example name="chip/Sizes" />

## Доступность

Чип — `<span>` без роли, сам по себе он не интерактивен. Кнопка удаления — обычная `<button>`
в порядке табуляции; `removeTabbable="false"` выводит её из порядка в списках, где удаление
доступно с клавиатуры из поля, как в `NuiCombobox`. Для одиночного чипа передайте
`removeLabel` с названием элемента.

## API

<ApiReference name="NuiChip" />
