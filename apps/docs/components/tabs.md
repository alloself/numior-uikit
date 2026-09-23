# Вкладки

`NuiTabs` — вкладки по паттерну WAI-ARIA из частей `NuiTabList`, `NuiTab` и `NuiTabPanel`.
Стрелки переключают вкладки сразу (`activation="manual"` только двигает фокус), список бывает
горизонтальным и вертикальным, вариант `line` подчёркивает активную вкладку, `soft` двигает
подложку. Проп `tabs` собирает список из данных, а слот `panel` — панели.

<script setup>
import { ref } from 'vue'
const tab = ref('general')
const period = ref('week')
const periods = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]
</script>

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiTabs v-model="tab">
    <NuiTabList label="Настройки проекта">
      <NuiTab value="general" icon="info">Общие</NuiTab>
      <NuiTab value="team">Команда</NuiTab>
      <NuiTab value="billing" disabled>Оплата</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="general">Название, описание и видимость проекта.</NuiTabPanel>
    <NuiTabPanel value="team">Участники и их роли.</NuiTabPanel>
    <NuiTabPanel value="billing">Тарифы и счета.</NuiTabPanel>
  </NuiTabs>
  <NuiTabs v-model="period" :tabs="periods" variant="soft" size="sm" activation="manual" label="Период">
    <template #panel="{ tab: item }">Статистика за период: {{ item.label.toLowerCase() }}.</template>
  </NuiTabs>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const tab = ref('general');
</script>

<template>
  <NuiTabs v-model="tab">
    <NuiTabList label="Настройки проекта">
      <NuiTab value="general" icon="info">Общие</NuiTab>
      <NuiTab value="team">Команда</NuiTab>
      <NuiTab value="billing" disabled>Оплата</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="general">…</NuiTabPanel>
    <NuiTabPanel value="team" lazy>…</NuiTabPanel>
    <NuiTabPanel value="billing">…</NuiTabPanel>
  </NuiTabs>
</template>
```

## Поведение

- Активная вкладка — единственная точка табуляции в списке; стрелки (ArrowLeft/Right для
  горизонтального списка, ArrowUp/Down для вертикального) ходят по кругу и пропускают
  отключённые вкладки, Home/End прыгают к краям. В RTL горизонтальные стрелки зеркальны.
- `activation="automatic"` (по умолчанию) выбирает вкладку при получении фокуса;
  `manual` только двигает фокус, выбор — по Enter, Space или клику. Когда фокус уходит из
  списка, точка табуляции возвращается на выбранную вкладку.
- Панели остаются в DOM и скрываются; `lazy` на панели или на `NuiTabs` откладывает
  рендер содержимого до первого показа и больше его не размонтирует.
- Индикатор измеряется по выбранной вкладке и едет по `--nui-duration-slow`; на узких
  экранах горизонтальный список прокручивается, не ломая раскладку.

Задайте начальное значение `v-model`: без него ни одна вкладка не выбрана и панели скрыты.

## API

`NuiTabs`: `v-model` (`string`), `id`, `activation` (`'automatic' | 'manual'`), `orientation`
(`'horizontal' | 'vertical'`), `variant` (`'line' | 'soft'`), `size` (`NuiSize`), `lazy`, `tabs`
(`{ value, label, icon?, disabled? }[]`), `label` (для списка из `tabs`). Слоты `default` и
`panel="{ tab }"`. `NuiTabList`: `label` (`aria-label`). `NuiTab`: `value`, `icon`, `disabled`.
`NuiTabPanel`: `value`, `lazy`.

Блоки `nui-tabs` (модификаторы `--orientation-*`, `--variant-*`, `--size-*`; переменные
`--_height`, `--_padding`, `--_font-size`), `nui-tab-list` (модификатор `--orientation-*`,
элемент `__indicator`, переменные `--_indicator-start`, `--_indicator-size`,
`--_indicator-thickness`), `nui-tab` (модификаторы `--selected`, `--disabled`; элементы `__icon`,
`__label`), `nui-tab-panel`.
