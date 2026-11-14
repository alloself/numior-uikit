# Empty

Заглушка на месте пустого списка.

<Example name="empty/Basic" />

Опишите причину в `title` и `description`, а следующий шаг — в слоте `actions`.

## Установка

```ts
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
```

## Использование

Поменяйте размер и текст, уберите иконку.

<Configurator name="NuiEmpty" />

## Примеры

### Показать в узком месте

Задайте `size="sm"`.

<Example name="empty/Compact" />

Такую же заглушку сами показывают [List](/components/list), [Tree](/components/tree),
[Select](/components/select), [Combobox](/components/combobox) и [Command](/components/command),
когда показывать нечего.

## Доступность

Заголовок заглушки выводится обычным абзацем, поэтому не нарушает порядок заголовков на странице.
Иконку экранный диктор не читает, так что смысл передайте текстом в `title` или `description`.

## API

<ApiReference name="NuiEmpty" />
