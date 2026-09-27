# Tabs

`NuiTabs` — вкладки по паттерну WAI-ARIA из частей `NuiTabList`, `NuiTab` и `NuiTabPanel`.
Стрелки переключают вкладки сразу, `activation="manual"` только двигает фокус; вариант `line`
подчёркивает активную вкладку, `soft` двигает подложку.

<Example name="tabs/Basic" />

## Установка

```ts
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import '@numior/vue/styles/tabs.css';
```

## Примеры

### Вкладки из данных

`tabs` собирает список из данных, слот `panel` рендерит панель каждой вкладки.

<Example name="tabs/Data" />

### Вертикальный список

`orientation="vertical"` ставит список в колонку; стрелки вверх и вниз ходят по вкладкам.

<Example name="tabs/Vertical" />

## Поведение

Активная вкладка — единственная точка табуляции в списке; стрелки ходят по кругу и пропускают
отключённые вкладки. Панели остаются в DOM и скрываются, `lazy` откладывает рендер до первого
показа. Без начального `v-model` ни одна вкладка не выбрана.

<KeyboardReference name="NuiTabs" />

## API

<ApiReference :names="['NuiTabs', 'NuiTabList', 'NuiTab', 'NuiTabPanel']" />
