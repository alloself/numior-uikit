# Sidebar

`NuiSidebar` — боковая панель навигации приложения внутри [Layout](/components/layout). В ней
шапка, группы пунктов с вложенными списками и подвал.

Sidebar всегда на экране и делит его с содержимым. Для панели, которая открывается поверх
страницы ради одной задачи, берите [Drawer](/components/drawer); в него же превращается Sidebar
на телефоне.

<Example name="sidebar/Basic" />

Свойство `collapsible` решает, что происходит при сворачивании. При `icon` остаётся узкая полоса
с иконками, при `offcanvas` панель уезжает за край экрана, при `none` она не сворачивается.

## Установка

```ts
import { NuiSidebar, NuiSidebarContent, NuiSidebarGroup, NuiSidebarItem } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/sidebar.css';
```

## Примеры

### Без фона

`variant="plain"` убирает фон и рамку, а текущий пункт выделяется цветом. Так выглядит панель
этой документации.

<Example name="sidebar/Plain" />

### На подложке

`variant="inset"` кладёт панель на приглушённый фон, а содержимое страницы — в приподнятую
карточку со скруглёнными углами. Сворачивание в полосу иконок и за край работает так же.

<Example name="sidebar/Inset" />

### Плавающая

`variant="floating"` показывает панель отдельной карточкой с рамкой и тенью, с отступом от краёв
экрана.

<Example name="sidebar/Floating" />

## Поведение

В свёрнутой полосе иконок подпись пункта видна в подсказке. Вложенный список открывается панелью
рядом с полосой при наведении, щелчке или нажатии стрелки.

`side="end"` ставит панель справа, а при письме справа налево — слева. Группа с `collapsible`
сворачивается кнопкой в своей подписи, а `NuiSidebarSub` — кнопкой в строке пункта.

## Доступность

Панель — ориентир `aside` с подписью из `label`, внутри него `nav` со списками пунктов. Текущий
пункт отмечен `aria-current="page"`, и диктор называет его текущей страницей.

Пункт с `href` или `to` становится ссылкой, остальные — кнопками. В полосе иконок подписи скрыты
с экрана, но диктор их читает.

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
