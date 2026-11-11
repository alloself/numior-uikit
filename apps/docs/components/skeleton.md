# Skeleton

`NuiSkeleton` — серая заглушка на месте текста, картинки или аватара, пока загружаются данные.
Страница сразу получает свою форму и не прыгает, когда данные приходят.

<Example name="skeleton/Basic" />

`shape` выбирает форму: `text` — строки текста, `rect` — прямоугольник, `circle` — круг. Число
строк задаёт `lines`, размеры — `width` и `height`. По заглушке пробегает блик,
`:animated="false"` его выключает.

## Установка

```ts
import { NuiSkeleton } from '@numior/vue';
import '@numior/vue/styles/skeleton.css';
```

## Использование

<Configurator name="NuiSkeleton" />

## Примеры

### Карточка во время загрузки

У [Card](/components/card) заглушки свои. Свойство `loading` ставит их на место заголовка,
описания, текста и картинки, и шапка карточки сохраняет размер.

<Example name="card/Loading" />

## Доступность

Диктор заглушку не видит и о загрузке сам не узнает. Отметьте контейнер `aria-busy="true"` на
время загрузки или покажите рядом [Progress](/components/progress) с подписью. `NuiCard` с
`loading` ставит `aria-busy` сам.

Если в системе включено уменьшение анимации, блик не бежит.

## API

<ApiReference name="NuiSkeleton" />
