# useIcon

`useIcon(icon)` возвращает компонент иконки по её имени, например `'x'` или `'check'`. На нём
работает `NuiIcon`.

Если иконка с таким именем задана в опции `icons`, вернётся она, иначе — встроенная иконка
Lucide. Встроенная иконка загружается при первом показе. Компонент вместо имени вернётся как
есть.

`lazyIcon(loader)` превращает динамический импорт в компонент иконки, который загрузится один
раз при первом показе.

## Сигнатура

<SignatureReference :names="['useIcon', 'useIcons', 'lazyIcon', 'IconSource', 'IconRegistry']" />

## Использование

Используйте `useIcon`, когда иконку ждёт сторонний компонент, а не `NuiIcon`. Он получит ту же
иконку, что выбрана для этого имени в приложении:

```vue
<template>
  <ExternalTabs :items="tabs" :close-icon="close" />
</template>

<script setup lang="ts">
import { useIcon } from '@numior/kit';

const close = useIcon('x');
</script>
```

`useIcons()` возвращает только иконки, заданные в ближайших настройках. Как заменить встроенные
иконки, описано на странице [Icon](/components/icon).
