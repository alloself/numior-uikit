# Accordion

`NuiAccordion` собирает секции `NuiAccordionItem` в один список: по умолчанию открыта одна
секция (`v-model`), с `multiple` — несколько (`v-model:values`). Каждая секция — тот же
[Collapsible](/components/collapsible).

<Example name="accordion/Basic" />

## Установка

```ts
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
import '@numior/vue/styles/accordion.css';
```

## Примеры

### Несколько секций

`multiple` держит открытыми несколько секций, `variant="card"` рисует их карточками,
`disabled` на секции закрывает её для клика.

<Example name="accordion/Multiple" />

## Поведение

`collapsible="false"` не даёт закрыть единственную открытую секцию кликом: одна секция
открыта всегда. `headingLevel` задаёт уровень заголовков всех секций разом.

## Доступность

Заголовки секций — кнопки с `aria-expanded`; стрелки ходят между ними по кругу, Home и End
ведут к первой и последней.

<KeyboardReference name="NuiAccordion" />

## API

<ApiReference :names="['NuiAccordion', 'NuiAccordionItem']" />
