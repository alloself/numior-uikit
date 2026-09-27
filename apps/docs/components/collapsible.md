# Collapsible

`NuiCollapsible` прячет содержимое за кнопкой-заголовком. Состояние живёт в `v-model:open`,
высота анимируется через токены движения, а скрытый текст остаётся в DOM и находится
поиском по странице.

<Example name="collapsible/Basic" />

## Установка

```ts
import { NuiCollapsible } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
```

## Использование

<Configurator name="NuiCollapsible" />

## Примеры

### Свой заголовок

Слот `trigger` получает `open` и меняет текст кнопки; `v-model:open` открывает содержимое
снаружи.

<Example name="collapsible/Trigger" />

## Поведение

Закрытое содержимое помечено `hidden="until-found"`: браузерный поиск по странице
раскрывает секцию сам. `headingLevel` оборачивает кнопку в `h2`–`h6`, чтобы секция попала
в структуру документа.

## Доступность

Кнопка несёт `aria-expanded` и `aria-controls` содержимого; `disabled` выключает её
нативно.

<KeyboardReference name="NuiCollapsible" />

## API

<ApiReference name="NuiCollapsible" />
