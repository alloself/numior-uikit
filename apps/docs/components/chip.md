# Chip

Метка выбранного значения, которую можно убрать.

<Example name="chip/Basic" />

Для статуса или счётчика возьмите [Badge](/components/badge).

## Установка

```ts install
import { NuiChip } from '@numior/vue';
```

## Использование

Подберите цвет, заливку и размер чипа.

<Configurator name="NuiChip" />

## Примеры

### Снять фильтр крестиком

Добавьте `removable` и уберите значение в обработчике `remove`.

<Example name="chip/Removable" />

## Доступность

Кнопка удаления подписана «Убрать». Если чипов несколько, добавьте в `removeLabel` название
значения, чтобы экранный диктор различал кнопки.

Tab доходит до кнопки удаления. С `:remove-tabbable="false"` Tab её пропускает, как в
[Combobox](/components/combobox), где чипы удаляются с клавиатуры прямо из поля.

## API

<ApiReference name="NuiChip" />
