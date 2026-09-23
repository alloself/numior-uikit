# Иконки и конфигурация

Компоненты kit не привязаны к одному набору иконок. Каждая нужная им иконка
запрашивается по алиасу через реестр: `check`, `minus`, `loader`, `chevron-down`,
`x`, `search`, `info`, `success`, `warning`, `error`. По умолчанию алиасы указывают на [Lucide](https://lucide.dev) (ISC):
каждая иконка загружается по требованию отдельным модулем при первом использовании
алиаса и затем переиспользуется из кэша; в bundle попадают только запрошенные глифы,
а на сервере иконка рендерится сразу.

<div class="nui-demo" data-nui-theme="light">
  <NuiIcon alias="check" />
  <NuiIcon alias="minus" />
  <NuiIcon alias="loader" />
  <NuiIcon alias="chevron-down" />
  <NuiIcon alias="x" />
  <NuiIcon alias="search" />
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

Реестр — обычный объект «алиас → компонент». Его можно подключить для поддерева
через `NuiConfigProvider` или для всего приложения через плагин `createNuiConfig`.
Вложенные провайдеры наслаиваются: ближайший переопределяет только заданные алиасы.

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
<NuiConfigProvider :icons="{ check: CheckIcon }">
  <!-- здесь checkbox и кнопки используют CheckIcon -->
</NuiConfigProvider>
```

Собственные алиасы тоже допустимы: `provideNuiConfig({ icons: { 'my-app:save': SaveIcon } })`
и затем `<NuiIcon alias="my-app:save" />`. Неизвестный алиас не рисует ничего. Тяжёлые
наборы подключайте лениво: `lazyIcon(() => import('./icons/SaveIcon.vue'))` возвращает
компонент, который загружается один раз при первом рендере.

## API

| Компонент           | Prop    | Тип                         | Описание                               |
| ------------------- | ------- | --------------------------- | -------------------------------------- |
| `NuiIcon`           | `alias` | `IconAlias` (`string`)      | Алиас из реестра или дефолтного набора |
| `NuiIcon`           | `icon`  | `Component`                 | Явный компонент, приоритетнее `alias`  |
| `NuiConfigProvider` | `icons` | `Record<string, Component>` | Алиасы для поддерева                   |

Из `@numior/vue` также экспортируются `createNuiConfig`, `provideNuiConfig`,
`useIcons` и `defaultIcons`.
