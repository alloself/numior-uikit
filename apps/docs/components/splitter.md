# Splitter

Две панели с подвижной границей.

<Example name="splitter/Basic" />

Доля первой панели хранится в `v-model:ratio`, а её границы — в `min` и `max`. Панели положите в
слоты `start` и `end`.

## Установка

```ts install
import { NuiSplitter } from '@numior/vue';
```

## Примеры

### Поставить панели одну над другой

Задайте `orientation="vertical"`.

<Example name="splitter/Vertical" />

## Поведение

Задайте Splitter высоту, например `h-full` внутри родителя с высотой: панели заполняют её, а
лишнее прокручивается внутри панели.

## Доступность

Граница получает фокус по Tab, и экранный диктор называет её положение в процентах. Подпись по
умолчанию — «Изменить размер панелей», свою передайте в `label`.

<KeyboardReference name="NuiSplitter" />

## API

<ApiReference name="NuiSplitter" />
