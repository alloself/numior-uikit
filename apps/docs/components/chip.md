# Чип

`NuiChip` — компактная метка на токенах ролей: `tone` задаёт цвет, `variant` — форму
(`soft`, `outline`, `solid`), `size` — высоту 1.5rem или 1.25rem. `removable` добавляет
кнопку удаления с доступным именем из `removeLabel` и событием `remove`. Тот же чип
показывает выбранные значения в `NuiCombobox`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiChip>Нейтральный</NuiChip>
  <NuiChip tone="primary" icon="check">С иконкой</NuiChip>
  <NuiChip tone="success" variant="outline">Контур</NuiChip>
  <NuiChip tone="warning" variant="solid">Сплошной</NuiChip>
  <NuiChip removable remove-label="Убрать Vue">Vue</NuiChip>
  <NuiChip size="sm" tone="info" removable remove-label="Убрать Vite">Vite</NuiChip>
</div>

```vue
<script setup lang="ts">
import { NuiChip } from '@numior/vue';
import '@numior/vue/styles/chip.css';
</script>

<template>
  <NuiChip tone="success" variant="outline">Оплачено</NuiChip>
  <NuiChip removable remove-label="Убрать фильтр «Vue»" @remove="clear">Vue</NuiChip>
</template>
```

## Доступность

Чип — `<span>`, он не интерактивен сам по себе. Кнопка удаления — обычная `<button>` с
именем из `removeLabel`; в неё не попасть по Tab (`tabindex="-1"`), потому что в списке
чипов удаление доступно с клавиатуры из поля (Backspace в комбобоксе). Если чип стоит
отдельно, продублируйте удаление в доступном месте или передайте `remove-label` с
названием элемента.

## API

| Prop          | Тип                              | По умолчанию                                  | Описание                       |
| ------------- | -------------------------------- | --------------------------------------------- | ------------------------------ |
| `tone`        | `NuiTone`                        | `'neutral'`                                   | Цвет                           |
| `variant`     | `'soft' \| 'outline' \| 'solid'` | `'soft'`                                      | Форма                          |
| `size`        | `'sm' \| 'md'`                   | `'md'`                                        | Высота                         |
| `icon`        | `IconAlias`                      | —                                             | Иконка перед текстом           |
| `removable`   | `boolean`                        | `false`                                       | Кнопка удаления                |
| `removeLabel` | `string`                         | [словарь](/guide/localization#chip): «Убрать» | Доступное имя кнопки           |
| `disabled`    | `boolean`                        | `false`                                       | Приглушённый вид, без удаления |

Событие `remove`. Блок `nui-chip`, модификаторы `--tone-*`, `--variant-*`, `--size-*`,
`--removable`, `--disabled`; элементы `__icon`, `__label`, `__remove`; переменные `--_tone`,
`--_tone-soft`, `--_height`, `--_padding`.
