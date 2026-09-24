# Иконки и конфигурация

Компоненты kit не привязаны к одному набору иконок. Каждая нужная им иконка
запрашивается по алиасу через реестр: `check`, `minus`, `loader`, `chevron-down`,
`x`, `search`, `info`, `success`, `warning`, `error`, `chevron-right`, `chevron-left`,
`chevrons-left`, `chevrons-right`, `ellipsis`, `external-link`, `user`, `image`, `inbox`,
`folder`, `folder-open`, `file`, `arrow-up`, `arrow-up-down`, `grip`, `plus`, `clock`. По умолчанию алиасы указывают на [Lucide](https://lucide.dev) (ISC):
каждая иконка загружается по требованию отдельным модулем при первом использовании
алиаса и затем переиспользуется из кэша; в bundle попадают только запрошенные глифы,
а на сервере иконка рендерится сразу.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiIcon alias="check" />
  <NuiIcon alias="minus" />
  <NuiIcon alias="loader" />
  <NuiIcon alias="chevron-down" />
  <NuiIcon alias="x" />
  <NuiIcon alias="search" />
  <NuiIcon alias="chevron-right" />
  <NuiIcon alias="ellipsis" />
  <NuiIcon alias="external-link" />
  <NuiIcon alias="user" />
  <NuiIcon alias="inbox" />
  <NuiIcon alias="folder" />
  <NuiIcon alias="arrow-up-down" />
</div>

## NuiIcon

`NuiIcon` рисует иконку по алиасу или принимает готовый компонент через `icon`.
Разметка декоративная: `aria-hidden="true"`, размер `1.25em` через класс `nui-icon`,
цвет наследуется от `currentColor`. Смысловое имя даёт родитель, например
`aria-label` на кнопке.

```vue
<script setup lang="ts">
import { NuiButton, NuiIcon } from '@numior/vue';
import { Trash2 } from 'lucide-vue-next';
</script>

<template>
  <NuiButton variant="ghost" tone="error" aria-label="Удалить">
    <NuiIcon :icon="Trash2" />
  </NuiButton>
  <NuiIcon alias="search" />
</template>
```

## Свой набор иконок

Реестр — обычный объект «алиас → компонент». Для всего приложения его подключает плагин
`createNuiConfig`, для поддерева — вызов `provideNuiConfig` в `setup` собственного
компонента-обёртки: компонентов-провайдеров в духе React кит не поставляет. Вложенные вызовы
наслаиваются: ближайший переопределяет только заданные алиасы.

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import CheckIcon from './icons/CheckIcon.vue';
import SpinnerIcon from './icons/SpinnerIcon.vue';

createApp(App)
  .use(createNuiConfig({ icons: { check: CheckIcon, loader: SpinnerIcon } }))
  .mount('#app');
```

```vue
<template><slot /></template>

<script setup lang="ts">
import { provideNuiConfig } from '@numior/vue';
import CheckIcon from './icons/CheckIcon.vue';

provideNuiConfig({ icons: { check: CheckIcon } });
</script>
```

Собственные алиасы тоже допустимы: `provideNuiConfig({ icons: { 'my-app:save': SaveIcon } })`
и затем `<NuiIcon alias="my-app:save" />`. Неизвестный алиас не рисует ничего. Тяжёлые
наборы подключайте лениво: `lazyIcon(() => import('./icons/SaveIcon.vue'))` возвращает
компонент, который загружается один раз при первом рендере.

## Локаль

Числа, время и даты форматируются по локали из той же конфигурации:
`createNuiConfig({ locale: 'ru-RU' })` для приложения, `provideNuiConfig({ locale })` в
`setup` компонента для поддерева (значение, ref или геттер), проп `locale` на компоненте
для точечного переопределения. Без настройки
действует `en-US`. `navigator.language` кит не читает: сервер и клиент должны форматировать
одинаково, поэтому локаль запроса передавайте в конфиг явно.

```ts
createApp(App)
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#app');
```

## API

| Где                                    | Опция    | Тип                         | Описание                               |
| -------------------------------------- | -------- | --------------------------- | -------------------------------------- |
| `NuiIcon`                              | `alias`  | `IconAlias` (`string`)      | Алиас из реестра или дефолтного набора |
| `NuiIcon`                              | `icon`   | `Component`                 | Явный компонент, приоритетнее `alias`  |
| `createNuiConfig` / `provideNuiConfig` | `icons`  | `Record<string, Component>` | Алиасы для приложения или поддерева    |
| `createNuiConfig` / `provideNuiConfig` | `toasts` | `ToastStoreOptions`         | Настройки сервиса уведомлений          |
| `createNuiConfig` / `provideNuiConfig` | `locale` | `string` (ref или геттер)   | Локаль чисел, времени и дат            |

Из `@numior/vue` также экспортируются `useIcons`, `defaultIcons` и `useLocale`.
