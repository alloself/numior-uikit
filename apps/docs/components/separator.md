# Separator

`NuiSeparator` — линия между блоками: горизонтальная в потоке или вертикальная в ряду кнопок.
С `label` текст встаёт посередине линии, а `decorative` убирает семантику у чисто визуальных
разделителей.

<Example name="separator/Basic" />

## Установка

```ts
import { NuiSeparator } from '@numior/vue';
import '@numior/vue/styles/separator.css';
```

## Использование

<Configurator name="NuiSeparator" />

## Примеры

### В ряду

`orientation="vertical"` растягивает линию на высоту ряда. Второй разделитель `decorative`:
скринридер его не объявляет.

<Example name="separator/Vertical" />

## Доступность

Без `decorative` линия несёт `role="separator"` и `aria-orientation`; с ним — `role="none"`.
Текст `label` читается как обычный текст между блоками.

## API

<ApiReference name="NuiSeparator" />
