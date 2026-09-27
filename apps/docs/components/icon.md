# Icon

Компоненты kit запрашивают иконки по алиасу через реестр, а `NuiIcon` рисует иконку по
алиасу или принимает готовый компонент. По умолчанию алиасы указывают на
[Lucide](https://lucide.dev): каждая иконка загружается отдельным модулем при первом
использовании, в сборку попадают только запрошенные глифы.

<Example name="icon/Basic" />

## Установка

```ts
import { NuiIcon } from '@numior/vue';
import '@numior/vue/styles/icon.css';
```

## Использование

<Configurator name="NuiIcon" />

## Примеры

### Свой компонент

`icon` принимает любой компонент, в том числе render-функцию с `h`; он приоритетнее
`alias`.

<Example name="icon/Custom" />

### Свой набор

Реестр — объект «алиас → компонент». Для приложения его передаёт `createNuiConfig`, для
поддерева — `provideNuiConfig` в `setup` собственного компонента; вложенные вызовы
наслаиваются и переопределяют только заданные алиасы.

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
        'app:save': lazyIcon(() => import('./icons/SaveIcon.vue')),
      },
    }),
  )
  .mount('#app');
```

Собственные алиасы вроде `app:save` доступны как `<NuiIcon alias="app:save" />`;
неизвестный алиас не рисует ничего. `lazyIcon` загружает модуль один раз при первом
рендере.

## Доступность

Иконка декоративна: `aria-hidden="true"`, размер `1.25em`, цвет наследуется от
`currentColor`. Смысловое имя даёт родитель, например `aria-label` на кнопке.

## API

<ApiReference name="NuiIcon" />
