# Меню

`NuiMenu` — выпадающее меню на нативном `popover="auto"` с `role="menu"`. Триггер приходит
через слот с `attrs` (как у поповера), пункты собираются из частей: `NuiMenuItem`,
`NuiMenuCheckboxItem`, `NuiMenuRadioGroup` с `NuiMenuRadioItem`, `NuiMenuSeparator`,
`NuiMenuLabel` и `NuiMenuSub` для подменю. Тот же набор можно описать данными через
проп `items`.

<script setup>
import { ref } from 'vue'
const grid = ref(true)
const sort = ref('name')
const last = ref('')
const entries = [
  { label: 'Копировать', shortcut: '⌘C', onSelect: () => (last.value = 'copy') },
  { type: 'separator' },
  { type: 'label', label: 'Экспорт' },
  { type: 'sub', label: 'Скачать как', items: [
    { label: 'PDF', onSelect: () => (last.value = 'pdf') },
    { label: 'CSV', onSelect: () => (last.value = 'csv') },
  ] },
]
</script>

<div class="nui-demo" data-nui-theme="light">
  <NuiMenu>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Действия</NuiButton>
    </template>
    <NuiMenuItem icon="check" shortcut="⌘R" @select="last = 'rename'">Переименовать</NuiMenuItem>
    <NuiMenuItem href="#docs">Документация</NuiMenuItem>
    <NuiMenuItem disabled>Архивировать</NuiMenuItem>
    <NuiMenuSeparator />
    <NuiMenuLabel>Вид</NuiMenuLabel>
    <NuiMenuCheckboxItem v-model:checked="grid">Сетка</NuiMenuCheckboxItem>
    <NuiMenuRadioGroup v-model="sort">
      <NuiMenuRadioItem value="name">По имени</NuiMenuRadioItem>
      <NuiMenuRadioItem value="date">По дате</NuiMenuRadioItem>
    </NuiMenuRadioGroup>
    <NuiMenuSeparator />
    <NuiMenuSub label="Поделиться">
      <NuiMenuItem @select="last = 'email'">Почта</NuiMenuItem>
      <NuiMenuItem @select="last = 'link'">Ссылка</NuiMenuItem>
    </NuiMenuSub>
    <NuiMenuItem tone="error" @select="last = 'delete'">Удалить</NuiMenuItem>
  </NuiMenu>
  <NuiMenu :items="entries" placement="bottom-end">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral" aria-label="Ещё"><NuiIcon alias="ellipsis" /></NuiButton>
    </template>
  </NuiMenu>
  <span class="nui-text-muted">Последнее: {{ last || '—' }}, сетка: {{ grid }}, сортировка: {{ sort }}</span>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
} from '@numior/vue';

const grid = ref(true);
const sort = ref('name');
</script>

<template>
  <NuiMenu>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Действия</NuiButton>
    </template>
    <NuiMenuItem icon="check" shortcut="⌘R" @select="rename">Переименовать</NuiMenuItem>
    <NuiMenuItem href="/docs">Документация</NuiMenuItem>
    <NuiMenuSeparator />
    <NuiMenuLabel>Вид</NuiMenuLabel>
    <NuiMenuCheckboxItem v-model:checked="grid">Сетка</NuiMenuCheckboxItem>
    <NuiMenuRadioGroup v-model="sort">
      <NuiMenuRadioItem value="name">По имени</NuiMenuRadioItem>
      <NuiMenuRadioItem value="date">По дате</NuiMenuRadioItem>
    </NuiMenuRadioGroup>
    <NuiMenuSub label="Поделиться">
      <NuiMenuItem @select="share('email')">Почта</NuiMenuItem>
      <NuiMenuItem @select="share('link')">Ссылка</NuiMenuItem>
    </NuiMenuSub>
    <NuiMenuItem tone="error" @select="remove">Удалить</NuiMenuItem>
  </NuiMenu>
</template>
```

## Данные вместо частей

`items` принимает массив записей: `{ label, icon?, shortcut?, disabled?, tone?, href?, to?, as?, closeOnSelect?, onSelect }`,
`{ type: 'checkbox', label, checked, onCheckedChange }`, `{ type: 'radio-group', value, onChange, items }`,
`{ type: 'separator' }`, `{ type: 'label', label }` и `{ type: 'sub', label, items }`. Записи рендерятся
теми же частями, поэтому стили и поведение совпадают; слот по умолчанию можно
комбинировать с `items`.

## Поведение

- Триггер: клик открывает меню, ArrowDown или Enter/Space открывают с фокусом на первом
  пункте, ArrowUp — на последнем. Открытое мышью меню фокусирует контейнер, а не пункт.
- Внутри: стрелки с зацикливанием, Home/End, набор первых букв (typeahead), Esc закрывает
  верхний уровень, Tab закрывает всё. Наведение переносит фокус на пункт; когда курсор
  уходит с меню, подсветка снимается.
- Пункт закрывает меню после выбора; `closeOnSelect="false"` на пункте или на меню
  оставляет его открытым. Чекбокс-пункт по умолчанию не закрывает, радио-пункт закрывает.
- Подменю открывается при наведении через 100 мс и закрывается через 300 мс после ухода,
  а также по ArrowRight/Enter/Space на своём пункте; ArrowLeft возвращает фокус на пункт
  (в RTL стрелки зеркальны). Подменю — вложенный нативный popover: клик снаружи закрывает
  всю цепочку, клик в родителе закрывает только подменю.
- При закрытии фокус возвращается на триггер, если он был внутри меню; это делается явно,
  потому что Safari не фокусирует кнопки по клику.

## Доступность

Контент — `role="menu"` с `aria-labelledby` на триггер (или `aria-label` через `label`),
триггер получает `aria-haspopup="menu"`, `aria-expanded` и `aria-controls`. Пункты —
нативные кнопки с `role="menuitem"`, `menuitemcheckbox` (`aria-checked`) и
`menuitemradio`; пункт с `href` или `to` — `NuiLink` с `role="menuitem"`. Отключённые
пункты остаются в DOM с `aria-disabled` и пропускаются при навигации.

## API

`NuiMenu`: `v-model:open`, `id`, `placement` (`'bottom-start'`), `offset` (`4`), `items`,
`closeOnSelect` (`true`), `loop` (`true`), `typeahead` (`true`), `label`. Слоты
`trigger="{ attrs, open }"` и `default`.

`NuiMenuItem`: `icon`, `shortcut`, `disabled`, `tone` (`'neutral' | 'error'`), `closeOnSelect`,
`href`, `to`, `as`; событие `select`. `NuiMenuCheckboxItem`: `v-model:checked`, `icon`,
`disabled`, `closeOnSelect` (`false`); событие `select`. `NuiMenuRadioGroup`: `v-model`;
`NuiMenuRadioItem`: `value`, `disabled`, `closeOnSelect` (`true`); событие `select`.
`NuiMenuSub`: `id`, `label` (или слот `label`), `icon`, `disabled`, `openDelay` (`100`),
`closeDelay` (`300`); слот по умолчанию — пункты подменю.

Блоки `nui-menu` (модификаторы `--side-*`, `--sub`), `nui-menu-item` (модификаторы
`--tone-*`, `--disabled`, `--checkable`, `--checked`, `--sub`, `--open`; элементы `__indicator`,
`__dot`, `__icon`, `__label`, `__shortcut`, `__chevron`; переменные `--_tone`, `--_indicator`),
`nui-menu-group`, `nui-menu-separator`, `nui-menu-label`.
