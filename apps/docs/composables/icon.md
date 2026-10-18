# useIcons

`useIcons()` возвращает реестр иконок ближайшей конфигурации: объект «алиас → компонент», в
котором поверх наборов пакетов лежат иконки приложения. `lazyIcon(loader)` оборачивает
динамический импорт в компонент, который загружается один раз при первом рендере. На этом
построен `NuiIcon`.

## Сигнатура

<SignatureReference :names="['useIcons', 'lazyIcon', 'IconRegistry', 'NuiIconAliases']" />

## Использование

```ts
import { h } from 'vue';
import { lazyIcon, useIcons } from '@numior/vue';

const icons = useIcons();
const save = lazyIcon(() => import('./icons/SaveIcon.vue'));
const render = () => (icons.check === undefined ? null : h(icons.check));
```

Алиас, которого нет в реестре, даёт `undefined`. Реестр, свои наборы и объявление своих алиасов
описаны на странице [Icon](/components/icon).
