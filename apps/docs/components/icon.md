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

const appIcons = {
  check: CheckIcon,
  loader: lazyIcon(() => import('./icons/SpinnerIcon.vue')),
  'app:save': lazyIcon(() => import('./icons/SaveIcon.vue')),
};

declare module '@numior/primitives' {
  interface NuiIconSets {
    app: typeof appIcons;
  }
}

createApp(App)
  .use(createNuiConfig({ icons: appIcons }))
  .mount('#app');
```

Алиас — это ключ одного из наборов в `NuiIconSets`. Кит объявляет там свой набор, редактор —
свой, а приложение добавляет одну строку со своим реестром, как выше.

Поэтому `icon` принимает только существующие ключи, и опечатка становится ошибкой типов:
`<NuiIcon icon="app:save" />` проходит проверку, `<NuiIcon icon="app:sav" />` — нет. `lazyIcon`
загружает модуль один раз при первом рендере.

## Доступность

Иконка декоративна: `aria-hidden="true"`, размер `1.25em`, цвет наследуется от
`currentColor`. Смысловое имя даёт родитель, например `aria-label` на кнопке.

## API

<ApiReference name="NuiIcon" />
