# Skeleton

Заглушка на месте содержимого, пока оно загружается.

<Example name="skeleton/Basic" />

## Установка

```ts install
import { NuiSkeleton } from '@numior/kit';
```

## Использование

Выберите форму заглушки и число строк.

<Configurator name="NuiSkeleton" />

## Примеры

### Показать загрузку карточки

Задайте карточке `loading`: заглушки встанут на место картинки, заголовка и текста.

<Example name="card/Loading" />

## Доступность

Отметьте контейнер `aria-busy`, пока идёт загрузка:

```vue
<section :aria-busy="loading">
```

Экранный диктор заглушку не видит, а `aria-busy` подсказывает ему дождаться содержимого. `NuiCard`
с `loading` ставит `aria-busy` сам. Чтобы
сообщить о загрузке вслух, покажите рядом [Progress](/components/progress) с подписью.

Если в системе включено уменьшение анимации, блик по заглушке не бежит.

## API

<ApiReference name="NuiSkeleton" />
