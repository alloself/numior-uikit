# Chip

`NuiChip` — компактная метка на токенах ролей: `tone` задаёт цвет, `variant` — вид, `size` —
высоту. Тот же чип показывает выбранные значения в `NuiCombobox`.

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
вне порядка табуляции, потому что в списках чипов удаление доступно с клавиатуры из поля.
Для одиночного чипа передайте `removeLabel` с названием элемента.

## API

<ApiReference name="NuiChip" />
