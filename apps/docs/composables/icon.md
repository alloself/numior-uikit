# useIcon

`useIcon(icon)` превращает источник иконки в компонент, на этом построен `NuiIcon`. Алиас даёт
иконку из конфигурации, а без неё — иконку Lucide из кита, которая загружается при первом
обращении. Компонент остаётся как есть.

`lazyIcon(loader)` оборачивает динамический импорт в компонент, который загружается один раз при
первом рендере.

## Сигнатура

<SignatureReference :names="['useIcon', 'useIcons', 'lazyIcon', 'IconSource', 'IconRegistry']" />

## Использование

`useIcon` нужен там, где иконку ждёт не `NuiIcon`, а чужой компонент: ему передаётся тот же
глиф, который приложение выбрало для алиаса.

```vue
<template>
  <ExternalTabs :items="tabs" :close-icon="close" />
</template>

<script setup lang="ts">
import { useIcon } from '@numior/vue';

const close = useIcon('x');
</script>
```

`useIcons()` возвращает только переопределения ближайшей конфигурации. Как заменить иконки кита,
описано на странице [Icon](/components/icon).
