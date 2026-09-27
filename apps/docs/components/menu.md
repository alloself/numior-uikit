# Menu

`NuiMenu` — выпадающее меню на нативном `popover="auto"` с `role="menu"`. Пункты собираются из
частей: `NuiMenuItem`, `NuiMenuCheckboxItem`, `NuiMenuRadioGroup` с `NuiMenuRadioItem`,
`NuiMenuSeparator`, `NuiMenuLabel` и `NuiMenuSub`. Тот же набор описывается данными через
`items`.

<Example name="menu/Basic" />

## Установка

```ts
import { NuiMenu, NuiMenuItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/menu.css';
```

## Примеры

### Меню действий из данных

`items` принимает записи `{ label, icon, shortcut, tone, onSelect }`, `{ type: 'checkbox' }`,
`{ type: 'radio-group' }`, `{ type: 'separator' }`, `{ type: 'label' }` и `{ type: 'sub' }`.
Записи рендерятся теми же частями.

<Example name="menu/Items" />

## Поведение

Клик открывает меню; открытое мышью меню фокусирует контейнер, открытое с клавиатуры —
первый или последний пункт. Наведение переносит фокус на пункт. Пункт закрывает меню после
выбора, `closeOnSelect="false"` оставляет его открытым; чекбокс-пункт по умолчанию не
закрывает.

Подменю открывается при наведении с задержкой и по стрелке на своём пункте. Подменю —
вложенный нативный popover: клик снаружи закрывает всю цепочку, клик в родителе — только
подменю. При закрытии фокус возвращается на триггер.

## Доступность

Триггер получает `aria-haspopup="menu"`, `aria-expanded` и `aria-controls`. Пункты — нативные
кнопки с `role="menuitem"`, `menuitemcheckbox` и `menuitemradio`; пункт с `href` или `to` —
`NuiLink` с той же ролью. Отключённые пункты остаются в дереве и получают фокус, но не
срабатывают.

<KeyboardReference name="NuiMenu" />

## API

<ApiReference
  :names="[
    'NuiMenu',
    'NuiMenuItem',
    'NuiMenuCheckboxItem',
    'NuiMenuRadioGroup',
    'NuiMenuRadioItem',
    'NuiMenuLabel',
    'NuiMenuSeparator',
    'NuiMenuSub',
  ]"
/>
