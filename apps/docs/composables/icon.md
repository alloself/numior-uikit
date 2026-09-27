# useIcon

`useIcon(alias)` возвращает компонент иконки из реестра ближайшей конфигурации, `useIcons()`
— весь реестр. `lazyIcon(loader)` оборачивает динамический импорт в компонент, который
загружается один раз при первом рендере. На этом построен `NuiIcon`.

## Сигнатура

<SignatureReference :names="['useIcon', 'useIcons', 'lazyIcon', 'IconRegistry']" />

## Использование

```ts
import { h } from 'vue';
import { lazyIcon, useIcon } from '@numior/vue';

const check = useIcon('check');
const save = lazyIcon(() => import('./icons/SaveIcon.vue'));
const render = () => (check.value ? h(check.value) : null);
```

Неизвестный алиас даёт `undefined`. Реестр и свои наборы описаны на странице
[Icon](/components/icon).
