# Empty

`NuiEmpty` объясняет, почему на месте данных ничего нет, и предлагает действие: иконка или
иллюстрация, `title`, `description` и слот `actions`. Компактный `size="sm"` показывают
[List](/components/list), `NuiSelect` и `NuiCombobox` без совпадений.

<Example name="empty/Basic" />

## Установка

```ts
import { NuiEmpty } from '@numior/vue';
import '@numior/vue/styles/empty.css';
```

## Использование

<Configurator name="NuiEmpty" />

## Примеры

### Компактный

`size="sm"` для списков и выпадающих списков; `hideIcon` убирает иконку.

<Example name="empty/Compact" />

## Доступность

Заголовок — абзац, а не heading: пустое состояние живёт внутри секции и не ломает порядок
заголовков. Иконка декоративна, смысл несёт текст, поэтому нужен `title` или `description`.

## API

<ApiReference name="NuiEmpty" />
