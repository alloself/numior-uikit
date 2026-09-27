# Badge

`NuiBadge` — неинтерактивная метка меньше чипа: статус, счётчик или точка состояния.
`tone` задаёт цвет, `variant` — форму (`soft`, `outline`, `solid`), `size` — высоту 1.25rem
или 1rem. `count` с `max` показывает число и «99+», `dot` рисует только точку, `floating`
сажает бейдж в угол родителя. Для удаляемых значений есть [чип](/components/chip).

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiBadge>Черновик</NuiBadge>
  <NuiBadge tone="primary" icon="check">Готово</NuiBadge>
  <NuiBadge tone="success" variant="outline">Оплачен</NuiBadge>
  <NuiBadge tone="warning" variant="solid" size="sm">Beta</NuiBadge>
  <NuiBadge tone="error" :count="120" />
  <NuiBadge tone="info" :count="7" :max="5" />
  <NuiBadge tone="success" dot label="В сети" />
  <span style="position: relative; display: inline-flex">
    <NuiButton variant="outline" tone="neutral" aria-label="Уведомления"><NuiIcon alias="inbox" /></NuiButton>
    <NuiBadge tone="error" :count="3" floating />
  </span>
</div>

```vue
<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
import '@numior/vue/styles/badge.css';
</script>

<template>
  <NuiBadge tone="success" variant="outline">Оплачен</NuiBadge>
  <NuiBadge tone="error" :count="unread" />
  <NuiBadge tone="success" dot label="В сети" />
  <span style="position: relative">
    <NuiButton aria-label="Уведомления"><NuiIcon alias="inbox" /></NuiButton>
    <NuiBadge tone="error" :count="unread" floating />
  </span>
</template>
```

## Доступность

Бейдж — `<span>` без роли, его текст читается вместе с окружением. Точка (`dot`) не несёт
текста, поэтому ей нужен `label`: бейдж получает `role="img"` и `aria-label`. Точка без
`label` считается декоративной и скрывается от вспомогательных технологий
(`aria-hidden="true"`). Счётчик поверх иконки не заменяет доступное имя кнопки: назовите
её так, чтобы число было понятно из контекста.

## API

| Prop       | Тип                              | По умолчанию | Описание                                         |
| ---------- | -------------------------------- | ------------ | ------------------------------------------------ |
| `tone`     | `NuiTone`                        | `'neutral'`  | Цвет                                             |
| `variant`  | `'soft' \| 'outline' \| 'solid'` | `'soft'`     | Форма                                            |
| `size`     | `'sm' \| 'md'`                   | `'md'`       | Высота                                           |
| `icon`     | `IconAlias`                      | —            | Иконка перед текстом                             |
| `count`    | `number`                         | —            | Число вместо текста; слот важнее                 |
| `max`      | `number`                         | `99`         | Порог, после которого выводится `max+`           |
| `dot`      | `boolean`                        | `false`      | Только точка состояния                           |
| `label`    | `string`                         | —            | Доступное имя точки                              |
| `floating` | `boolean`                        | `false`      | Абсолютно в углу родителя с `position: relative` |

Слот `default` заменяет `count`. Блок `nui-badge`, модификаторы `--tone-*`, `--variant-*`,
`--size-*`, `--dot`, `--floating`; элементы `__icon`, `__label`; переменные `--_tone`,
`--_tone-soft`, `--_height`, `--_padding`, `--_dot-size`, `--_float-x` (в RTL меняет знак).
