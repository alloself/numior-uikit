# useLayout

`useLayout()` возвращает контекст ближайшего `NuiLayout`: состояние боковой панели `open` и
`mobileOpen`, признак узкого экрана `mobile`, `sidebarId` для `aria-controls` и `toggle()`.
Так свои кнопки в шапке управляют панелью.

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

Вне `NuiLayout` вызов бросает ошибку. Компонент описан на странице [Layout](/components/layout).
