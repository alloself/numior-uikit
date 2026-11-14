# Badge

Короткая метка статуса или счётчик.

<Example name="badge/Basic" />

Метку, которую пользователь может убрать, показывает [Chip](/components/chip).

## Установка

```ts
import { NuiBadge } from '@numior/vue';
import '@numior/vue/styles/badge.css';
```

## Использование

Поменяйте цвет, заливку и размер.

<Configurator name="NuiBadge" />

## Примеры

### Показать число

Передайте число в `count`.

<Example name="badge/Count" />

Число больше `max` бейдж показывает с плюсом, по умолчанию «99+».

### Отметить точкой

Добавьте `dot` и подпись в `label`.

<Example name="badge/Dot" />

### Прикрепить к кнопке

Добавьте `floating`.

<Example name="badge/Floating" />

Бейдж встаёт в правый верхний угол ближайшего родителя с `position: relative`, а при направлении
текста справа налево — в левый. У кнопки такой стиль уже есть, своему блоку добавьте класс `relative`.

## Доступность

Текст и число бейджа экранный диктор читает вместе с окружающим текстом. Точку он называет по
`label`, а точку без `label` пропускает.

## API

<ApiReference name="NuiBadge" />
