# Sidebar

Боковое меню приложения.

Sidebar всегда на экране и делит его с содержимым, а [Drawer](/components/drawer) открывается
поверх страницы ради одной задачи.

<Example name="sidebar/Basic" />

Задайте `collapsible`, чтобы выбрать, как меню сворачивается:

- `icon` — остаётся узкая полоса с иконками;
- `offcanvas` — меню уезжает за край экрана, так по умолчанию;
- `none` — меню не сворачивается.

## Установка

```ts install
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, NuiSidebarItem } from '@numior/vue';
```

## Примеры

### Убрать фон

Задайте `variant="plain"`.

<Example name="sidebar/Plain" />

Так выглядит панель этой документации.

### Положить на подложку

Задайте `variant="inset"`.

<Example name="sidebar/Inset" />

### Показать отдельной карточкой

Задайте `variant="floating"`.

<Example name="sidebar/Floating" />

## Поведение

- В свёрнутой полосе подпись пункта видна в подсказке.
- Вложенный список в полосе открывается панелью рядом при наведении. Клик закрепляет панель, а
  Escape, клик вне её или второй клик по кнопке закрывают.
- `NuiSidebarSub` с `active` раскрыт с первого кадра, в том числе на сервере.
- `side="end"` ставит меню справа, а на страницах с текстом справа налево — слева.
- Группа с `collapsible` сворачивается кнопкой в своей подписи.

## Доступность

Меню — ориентир `aside` с подписью из `label`, внутри него `nav` со списками пунктов. Текущий
пункт экранный диктор называет текущей страницей.

Пункт с `href` или `to` становится ссылкой, остальные — кнопками. В полосе иконок подписи скрыты с
экрана, но диктор их читает.

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
