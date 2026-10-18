# useIcons

`useIcons()` возвращает реестр иконок ближайшей конфигурации: объект «алиас → компонент», в
котором поверх наборов пакетов лежат иконки приложения. `lazyIcon(loader)` оборачивает
динамический импорт в компонент, который загружается один раз при первом рендере. На этом
построен `NuiIcon`.

## Сигнатура

<SignatureReference :names="['useIcons', 'lazyIcon', 'IconRegistry', 'NuiIconSets']" />

## Использование

Реестр нужен там, где иконку ждёт не `NuiIcon`, а чужой компонент: ему передаётся тот же
глиф, который приложение выбрало для алиаса.

```vue
<template>
  <ExternalTabs :items="tabs" :close-icon="icons.x" />
</template>

<script setup lang="ts">
import { useIcons } from '@numior/vue';

const icons = useIcons();
</script>
```

Алиас, которого нет в реестре, даёт `undefined`. Реестр, свои наборы и объявление своих алиасов
описаны на странице [Icon](/components/icon).
