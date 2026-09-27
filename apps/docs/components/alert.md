# Alert

`NuiAlert` — статическое сообщение внутри страницы: `variant` задаёт вид, `tone` — роль и
иконку. Для `tone="error"` элемент получает `role="alert"`, остальные читаются как обычный
текст.

<Example name="alert/Basic" />

## Установка

```ts
import { NuiAlert } from '@numior/vue';
import '@numior/vue/styles/alert.css';
```

## Использование

<Configurator name="NuiAlert" />

## Примеры

### Закрываемый алерт с действием

`dismissible` добавляет кнопку закрытия: она переводит `v-model:open` в `false` и шлёт
`dismiss`. Закрытый алерт остаётся в DOM; уберите его через `v-if`, если нужно.

<Example name="alert/Dismissible" />

## Доступность

Иконка декоративна, роль сообщения передаёт `tone`. Кнопки внутри мягкого алерта берут
`outline` или `solid`: `soft` того же тона сливается с фоном.

## API

<ApiReference name="NuiAlert" />
