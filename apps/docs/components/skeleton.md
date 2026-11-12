# Skeleton

Заглушка на месте содержимого, пока оно загружается.

<Example name="skeleton/Basic" />

## Установка

```ts
import { NuiSkeleton } from '@numior/vue';
import '@numior/vue/styles/skeleton.css';
```

## Использование

Выберите форму заглушки и число строк.

<Configurator name="NuiSkeleton" />

## Примеры

### Повторить форму карточки

Поставьте заглушки на место заголовка, текста и картинки.

<Example name="skeleton/Card" />

## Доступность

Отметьте контейнер `aria-busy`, пока идёт загрузка:

```vue
<NuiCard :aria-busy="loading">
```

Экранный диктор заглушку не видит, а `aria-busy` подсказывает ему дождаться содержимого. Чтобы
сообщить о загрузке вслух, покажите рядом [Progress](/components/progress) с подписью.

Если в системе включено уменьшение анимации, блик по заглушке не бежит.

## API

<ApiReference name="NuiSkeleton" />
