# Icon

Компоненты kit запрашивают иконки по алиасу через реестр, а `NuiIcon` рисует то, что передано
в `icon`: алиас из реестра или готовый компонент. По умолчанию алиасы указывают на
[Lucide](https://lucide.dev) из пакета `@lucide/vue`. Каждая иконка кита — отдельный маленький
модуль, `NuiIcon` загружает его при первом обращении к алиасу и запоминает.

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

`icon` принимает и любой компонент, например свою SVG-иконку в SFC: он рисуется как есть,
без реестра.

<Example name="icon/Custom" />

### Свои иконки вместо иконок кита

Алиасы кита (`check`, `x`, `chevron-down`, `loader` и другие) можно переопределить.
Приложение делает это через `createNuiConfig`, поддерево — через `provideNuiConfig` в `setup`
собственного компонента. Вложенные вызовы наслаиваются и меняют только заданные алиасы,
остальные остаются иконками Lucide.

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

Ключи реестра — только алиасы кита, поэтому опечатка становится ошибкой типов. Иконки
приложения алиасов не требуют: компонент передаётся в `icon` напрямую, например
`<NuiIcon :icon="Save" />` с `import { Save } from '@lucide/vue'`.

## Доступность

Иконка декоративна: `aria-hidden="true"`, размер `1.25em`, цвет наследуется от
`currentColor`. Смысловое имя даёт родитель, например `aria-label` на кнопке.

## API

<ApiReference name="NuiIcon" />
