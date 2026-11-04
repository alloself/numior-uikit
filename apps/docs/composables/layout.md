# useLayout

`useLayout()` даёт доступ к боковой панели ближайшего `NuiLayout`. Используйте его, чтобы своя
кнопка в шапке открывала и закрывала панель.

`open` — открыта ли панель на широком экране, `mobileOpen` — на узком, `mobile` — узкий ли экран
сейчас. `toggle()` открывает или закрывает панель для текущей ширины экрана. `sidebarId`
передайте кнопке в `aria-controls`.

## Сигнатура

<SignatureReference :names="['useLayout', 'LayoutContext']" />

## Использование

```vue
<template>
  <NuiButton
    variant="ghost"
    tone="neutral"
    :aria-expanded="layout.open.value"
    :aria-controls="layout.sidebarId.value"
    @click="layout.toggle()"
  >
    Меню
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, useLayout } from '@numior/vue';

const layout = useLayout();
</script>
```

Вне `NuiLayout` вызов выбросит ошибку. Компонент описан на странице [Layout](/components/layout).
