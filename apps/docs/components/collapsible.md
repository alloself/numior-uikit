# Collapsible

Секция, которая раскрывается по заголовку.

<Example name="collapsible/Basic" />

Несколько секций подряд собирает [Accordion](/components/accordion).

## Установка

```ts install
import { NuiCollapsible } from '@numior/vue';
```

## Использование

Поменяйте вид и текст заголовка.

<Configurator name="NuiCollapsible" />

## Примеры

### Поменять подпись заголовка

Опишите заголовок в слоте `trigger`.

<Example name="collapsible/Trigger" />

Открыть и закрыть секцию из кода можно через `v-model:open`.

## Поведение

Свёрнутый текст остаётся на странице: если найти его поиском браузера по Ctrl+F, секция раскроется
сама.

## Доступность

Заголовок — кнопка, и экранный диктор сообщает, раскрыта секция или свёрнута. С `disabled` кнопка
отключена, и секцию нельзя открыть или закрыть.

<KeyboardReference name="NuiCollapsible" />

## API

<ApiReference name="NuiCollapsible" />
