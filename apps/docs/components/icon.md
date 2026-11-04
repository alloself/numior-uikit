# Icon

`NuiIcon` выводит иконку по имени, например `check` или `search`, или ваш собственный компонент
иконки. По умолчанию имена соответствуют иконкам [Lucide](https://lucide.dev) из пакета
`@lucide/vue`.

<Example name="icon/Basic" />

Каждая иконка загружается отдельно, когда понадобится впервые, поэтому в сборку не попадает весь
набор. Иконки внутри компонентов Numior UI — стрелка списка, крестик диалога — выводятся так же.

## Установка

```ts
import { NuiIcon } from '@numior/vue';
import '@numior/vue/styles/icon.css';
```

## Использование

<Configurator name="NuiIcon" />

## Примеры

### Свой компонент

В `icon` можно передать любой компонент, например SVG-иконку в отдельном файле `.vue`. Она
выводится как есть, тем же размером и цветом.

<Example name="icon/Custom" />

Иконки приложения не нужно регистрировать: импортируйте нужную и передайте её напрямую,
например `<NuiIcon :icon="Save" />` с `import { Save } from '@lucide/vue'`.

### Свои иконки в компонентах

Иконки, которые используют компоненты Numior UI (`check`, `x`, `chevron-down`, `loader` и другие),
можно заменить своими. Для всего приложения передайте их в `icons` плагина `createNuiConfig`:

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

Заменятся только перечисленные иконки, остальные останутся из Lucide. `lazyIcon` загружает
иконку, только когда она впервые понадобится. Чтобы заменить иконки в одной части страницы,
вызовите `provideNuiConfig` в `setup` её компонента.

Ключи в `icons` проверяются типами, поэтому опечатка в имени сразу видна в редакторе.

## Доступность

Экранный диктор иконку не читает. Если кнопка состоит из одной иконки, задайте ей `aria-label`.
Размер иконки — 1,25 от размера шрифта, цвет — как у текста рядом.

## API

<ApiReference name="NuiIcon" />
