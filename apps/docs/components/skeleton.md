# Skeleton

`NuiSkeleton` — декоративная заглушка на время загрузки: `aria-hidden`, мерцающий градиент на
токенах поверхности. Под `prefers-reduced-motion` мерцание выключается, `animated="false"`
делает то же явно.

<Example name="skeleton/Basic" />

## Установка

```ts
import { NuiSkeleton } from '@numior/vue';
import '@numior/vue/styles/skeleton.css';
```

## Использование

<Configurator name="NuiSkeleton" />

## Примеры

### Карточка во время загрузки

Заглушки встают на место текста, поэтому раскладка не прыгает, когда приходят данные.

<Example name="skeleton/Card" />

## Доступность

Скелетон не сообщает о загрузке сам: пометьте контейнер `aria-busy="true"` или покажите
`NuiProgress` с подписью, чтобы экранный диктор узнал о процессе.

## API

<ApiReference name="NuiSkeleton" />
