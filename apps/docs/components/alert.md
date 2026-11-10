# Alert

`NuiAlert` — сообщение на странице: черновик сохранён, проект опубликован, сеть недоступна.
Всплывающие уведомления показывает [Toast](/components/toast).

<Example name="alert/Basic" />

## Установка

```ts
import { NuiAlert } from '@numior/vue';
import '@numior/vue/styles/alert.css';
```

## Использование

Свойство `tone` задаёт цвет и иконку: `info` (по умолчанию), `success`, `warning`, `error` и
другие. `variant` выбирает заливку: `soft`, `outline` или `solid`.

<Configurator name="NuiAlert" />

## Примеры

### Закрываемый алерт с действием

Передайте `closable`, чтобы в углу появилась кнопка закрытия. Нажатие на неё скрывает алерт,
ставит `v-model:open` в `false` и вызывает событие `close`.

<Example name="alert/Closable" />

Кнопки действий кладутся в слот `actions`. Внутри алерта `soft` берите кнопки `outline` или
`solid`: кнопка `soft` того же тона сливается с фоном.

## Доступность

Алерт с `tone="error"` получает `role="alert"`, и экранный диктор зачитывает его сразу после
появления. Остальные алерты читаются как обычный текст страницы, иконка в них декоративная.

## API

<ApiReference name="NuiAlert" />
