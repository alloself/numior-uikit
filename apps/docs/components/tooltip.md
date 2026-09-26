# Подсказка

`NuiTooltip` — попап с `role="tooltip"` и `popover="manual"`, связанный с триггером через
`aria-describedby`. Появляется при наведении с задержкой и сразу при клавиатурном фокусе,
скрывается при уходе курсора, потере фокуса и по Esc. На подсказку можно навести курсор,
не закрыв её; тап на сенсорных устройствах подсказку не показывает.

<script setup>
import { ref } from 'vue'
const open = ref(false)
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiTooltip v-model:open="open">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral">Сохранить</NuiButton>
    </template>
    Сохраняет документ и историю изменений
  </NuiTooltip>
  <NuiTooltip placement="right" :open-delay="0">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" aria-label="Удалить"><NuiIcon alias="x" /></NuiButton>
    </template>
    Удалить без подтверждения
  </NuiTooltip>
</div>

```vue
<NuiTooltip>
  <template #trigger="{ attrs }">
    <NuiButton v-bind="attrs" variant="ghost" tone="neutral">Сохранить</NuiButton>
  </template>
  Сохраняет документ и историю изменений
</NuiTooltip>
```

## Доступность

Подсказка описывает триггер, а не заменяет его имя: кнопке без текста всё равно нужен
`aria-label`. Поведение соответствует WCAG 1.4.13: закрывается по Esc, остаётся при
наведении на неё, не исчезает сама. Информация из подсказки должна быть доступна и без
неё, потому что на сенсорных экранах она не показывается.

## API

| Prop           | Тип                   | По умолчанию | Описание                                   |
| -------------- | --------------------- | ------------ | ------------------------------------------ |
| `v-model:open` | `boolean`             | `false`      | Показана ли подсказка                      |
| `id`           | `string`              | генерируется | Id подсказки и значение `aria-describedby` |
| `placement`    | `FloatingPlacement`   | `'top'`      | Сторона и выравнивание                     |
| `offset`       | `number`              | `6`          | Расстояние до триггера в px                |
| `openDelay`    | `number`              | `300`        | Задержка появления при наведении, мс       |
| `closeDelay`   | `number`              | `100`        | Задержка скрытия при уходе курсора, мс     |
| `disabled`     | `boolean`             | `false`      | Не показывать и не описывать триггер       |
| `anchor`       | `HTMLElement \| null` | —            | Внешний якорь вместо слота `trigger`       |

Слоты: `trigger="{ attrs, open }"`, `default`. `attrs` содержит `aria-describedby`,
function-ref и обработчики pointer/focus/keyboard. С `anchor` слот `trigger` не нужен:
подсказка встаёт у переданного элемента и сама слушает его наведение, фокус и Escape, но
`aria-describedby` не ставит — это визуальная подсказка, а имя и описание элемента задаёт
владелец (так боковая панель подписывает иконки в свёрнутом виде). Блок `nui-tooltip`,
элемент `__arrow`; сторону `useFloating` пишет в `--_side-x`/`--_side-y`, цвета берутся из
`--nui-neutral`.
