# Separator

`NuiSeparator` — линия между блоками страницы или кнопками в панели. С подписью она делит,
например, вход через Google и вход по почте.

<Example name="separator/Basic" />

Текст посередине линии задаёт `label` или слот по умолчанию.

## Установка

```ts
import { NuiSeparator } from '@numior/vue';
import '@numior/vue/styles/separator.css';
```

## Использование

<Configurator name="NuiSeparator" />

## Примеры

### В ряду

`orientation="vertical"` ставит вертикальную линию высотой с ряд, например между кнопками
панели инструментов.

<Example name="separator/Vertical" />

## Доступность

Диктор объявляет разделитель как границу между частями страницы. Если линия только украшает
ряд, передайте `decorative`, и диктор её пропустит; так сделано со второй линией в примере.

Подпись из `label` читается как обычный текст.

## API

<ApiReference name="NuiSeparator" />
