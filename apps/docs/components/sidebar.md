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

## Поведение

В режиме иконок подписи пунктов показываются в подсказках, а нажатие на подсписок сначала
раскрывает панель. `side` ставит панель в начале или в конце строки и следует за направлением
письма. Группа с `collapsible` сворачивается кнопкой в подписи, `NuiSidebarSub` — кнопкой с
`aria-expanded`.

## Доступность

Панель — `aside` с `aria-label`, содержимое — `nav`, группа — список с подписью через
`aria-labelledby`. Текущий пункт получает `aria-current="page"`, пункты со ссылкой рендерятся
через `NuiLink`, остальные — кнопками. В режиме иконок подписи скрыты визуально, но остаются
доступным именем.

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
