# Поповер

`NuiPopover` строится на Popover API: контент получает атрибут `popover="auto"`, триггер —
`popovertarget`. Браузер сам открывает слой в top layer, закрывает по Esc и по клику вне
(light dismiss), ставит контент сразу после триггера в порядке Tab. Позиция считается
через `useFloating` (flip, shift, стрелка) и обновляется при прокрутке и ресайзе.

<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>

<div class="nui-demo" data-nui-theme="light">
  <NuiPopover v-model:open="open" placement="bottom-start" arrow>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Фильтры</NuiButton>
    </template>
    <NuiField label="Автор">
      <NuiInput placeholder="Имя" />
    </NuiField>
  </NuiPopover>
  <span>Открыт: {{ open }}</span>
</div>

```vue
<NuiPopover v-model:open="open" placement="bottom-start" arrow>
  <template #trigger="{ attrs }">
    <NuiButton v-bind="attrs" variant="outline">Фильтры</NuiButton>
  </template>
  <NuiField label="Автор">
    <NuiInput />
  </NuiField>
</NuiPopover>
```

## Триггер

Слот `trigger` отдаёт `attrs` — объект с `popovertarget`, `aria-expanded`, `aria-controls`
и function-ref. Свяжите его через `v-bind` с любой кнопкой: нативной или `NuiButton`.
Клик открывает слой без JavaScript, а `v-model:open` остаётся источником правды для
программного управления. Слот также получает `open`.

## Top layer и тема

Контент остаётся в DOM рядом с триггером, поэтому наследует тему, плотность и `dir`
области и не зависит от `overflow` и `z-index` предков. Позиция задаётся `position:
fixed` относительно viewport. Появление анимируется через `@starting-style`; под
`prefers-reduced-motion` мгновенно.

## API

| Prop           | Тип                 | По умолчанию | Описание                                        |
| -------------- | ------------------- | ------------ | ----------------------------------------------- |
| `v-model:open` | `boolean`           | `false`      | Открыт ли слой                                  |
| `id`           | `string`            | генерируется | Id контента и цель `popovertarget`              |
| `placement`    | `FloatingPlacement` | `'bottom'`   | `top`/`bottom`/`left`/`right` с `-start`/`-end` |
| `offset`       | `number`            | `8`          | Расстояние до триггера в px                     |
| `arrow`        | `boolean`           | `false`      | Стрелка к триггеру                              |

Слоты: `trigger="{ attrs, open }"`, `default`. Атрибуты и классы попадают на контент.
Блок `nui-popover`, модификаторы `nui-popover--side-*` по фактической стороне после flip,
элемент `__arrow`, переменные `--_shift`, `--_arrow`. Для собственных слоёв экспортируются
`usePopover` и `useFloating`.
