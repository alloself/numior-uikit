# Icon

Компоненты kit запрашивают иконки по алиасу через реестр, а `NuiIcon` рисует то, что передано
в `icon`: алиас из реестра или готовый компонент. По умолчанию алиасы указывают на
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

`icon` принимает и любой компонент, в том числе render-функцию с `h`: он рисуется как есть,
без реестра.

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

Алиасы типизированы: `icon` принимает только ключи интерфейса `NuiIconAliases`, поэтому опечатка —
ошибка типов. Свой алиас приложение объявляет расширением интерфейса, а пакеты kit (например,
редактор) так же добавляют свои:

```ts
declare module '@numior/primitives' {
  interface NuiIconAliases {
    readonly 'app:save': true;
  }
}
```

После этого `<NuiIcon icon="app:save" />` проходит проверку типов. Объявленный, но не
зарегистрированный алиас не рисует ничего. `lazyIcon` загружает модуль один раз при первом
рендере.

## Доступность

Иконка декоративна: `aria-hidden="true"`, размер `1.25em`, цвет наследуется от
`currentColor`. Смысловое имя даёт родитель, например `aria-label` на кнопке.

## API

<ApiReference name="NuiIcon" />
