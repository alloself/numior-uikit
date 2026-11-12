# Icon

Иконка по имени или из вашего компонента.

<Example name="icon/Basic" />

Каждая иконка загружается отдельно, когда понадобится впервые. Размер иконки — 1,25 от размера
шрифта, цвет — как у текста рядом.

## Установка

```ts
import { NuiIcon } from '@numior/vue';
import '@numior/vue/styles/icon.css';
```

## Использование

Выберите имя иконки из списка.

<Configurator name="NuiIcon" />

## Примеры

### Вывести свою иконку

Передайте компонент в `icon`.

<Example name="icon/Custom" />

Иконку из `@lucide/vue` импортируйте и передайте так же: `<NuiIcon :icon="Save" />`.

### Заменить иконки в компонентах

Передайте свои иконки в `icons` плагина `createNuiConfig`.

```ts
import { createApp } from 'vue';
import { createNuiConfig, lazyIcon } from '@numior/vue';
import CheckIcon from './icons/CheckIcon.vue';

createApp(App)
  .use(
    createNuiConfig({
      icons: {
        check: CheckIcon,
        loader: lazyIcon(() => import('./icons/SpinnerIcon.vue')),
      },
    }),
  )
  .mount('#app');
```

Заменятся только перечисленные иконки, остальные останутся из Lucide. `lazyIcon` включает ленивую
загрузку: файл иконки придёт, когда она впервые понадобится.

### Имена иконок

Найдите имя по названию или по иконке Lucide.

<IconReference />

## Доступность

Экранный диктор иконку не читает. Если кнопка состоит из одной иконки, задайте ей `aria-label`.

## API

<ApiReference name="NuiIcon" />
