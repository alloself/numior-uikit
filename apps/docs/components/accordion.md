# Accordion

`NuiAccordion` — список секций, которые раскрываются по клику, например вопросы и ответы. По
умолчанию открыта одна секция, со свойством `multiple` — сколько угодно.

<Example name="accordion/Basic" />

## Установка

```ts
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';
import '@numior/vue/styles/collapsible.css';
import '@numior/vue/styles/accordion.css';
```

## Примеры

### Несколько секций

Передайте `multiple`, и `v-model:values` будет хранить список открытых секций. Свойство
`variant="card"` рисует каждую секцию отдельной карточкой, а `disabled` на `NuiAccordionItem`
выключает секцию.

<Example name="accordion/Multiple" />

## Поведение

Без `multiple` в `v-model` лежит `value` открытой секции или `null`, если все свёрнуты. С
`:collapsible="false"` открытую секцию нельзя свернуть повторным кликом: она закрывается, только
когда открывают другую.

Свойство `headingLevel` оборачивает заголовки всех секций в `<h2>`–`<h6>`, чтобы они попали в
структуру страницы. Секция устроена так же, как [Collapsible](/components/collapsible).

## Доступность

Заголовки секций — кнопки с `aria-expanded`. Стрелки вверх и вниз переходят между ними по кругу,
Home и End — к первой и последней секции. Клавиши работают, только когда фокус на заголовке: в
полях внутри секции они двигают курсор как обычно.

<KeyboardReference name="NuiAccordion" />

## API

<ApiReference :names="['NuiAccordion', 'NuiAccordionItem']" />
