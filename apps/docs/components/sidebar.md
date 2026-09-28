# Sidebar

`NuiSidebar` описывает боковую панель внутри [Layout](/components/layout): шапку, прокручиваемое
содержимое с группами пунктов, вложенные списки и подвал. `collapsible` задаёт, что делает
сворачивание: полоса иконок, уход за край или ничего.

<Example name="sidebar/Basic" />

## Установка

```ts
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, NuiSidebarItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/sidebar.css';
```

## Примеры

### Без фона

`variant="plain"` убирает фон и рамку, текущий пункт выделяется цветом; так устроена панель
этой документации.

<Example name="sidebar/Plain" />

### На подложке

`variant="inset"` кладёт панель на приглушённый фон, а содержимое каркаса — в приподнятую
карточку со скруглением. Полоса иконок и уход за край работают как обычно.

<Example name="sidebar/Inset" />

### Плавающая

`variant="floating"` рисует панель карточкой с рамкой и тенью, отступив от краёв каркаса.

<Example name="sidebar/Floating" />

## Поведение

В режиме иконок подписи пунктов показываются в подсказках, а подсписок открывается всплывающей
панелью рядом с полосой: по наведению, нажатию или стрелке.

`side` ставит панель в начале или в конце строки и следует за направлением письма. Группа с
`collapsible` сворачивается кнопкой в подписи, `NuiSidebarSub` — кнопкой с `aria-expanded`.

## Доступность

Панель — `aside` с `aria-label`, содержимое — `nav`, группа — список с подписью через
`aria-labelledby`. Текущий пункт получает `aria-current="page"`, пункты со ссылкой рендерятся
через `NuiLink`, остальные — кнопками. В режиме иконок подписи скрыты визуально, но остаются
доступным именем.

<KeyboardReference name="NuiSidebarSub" />

## API

<ApiReference
  :names="[
    'NuiSidebar',
    'NuiSidebarHeader',
    'NuiSidebarContent',
    'NuiSidebarFooter',
    'NuiSidebarGroup',
    'NuiSidebarItem',
    'NuiSidebarSub',
    'NuiSidebarTrigger',
  ]"
/>
