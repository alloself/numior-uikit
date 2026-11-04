# Drawer

`NuiDrawer` — панель, которая выезжает с края экрана поверх страницы: фильтры списка, корзина,
подробности заказа. Она ведёт себя как [Dialog](/components/dialog): держит фокус внутри,
закрывается по Esc и возвращает фокус на кнопку.

<Example name="drawer/Filters" />

Постоянное меню приложения сделайте через [Sidebar](/components/sidebar): оно стоит рядом с
содержимым, а на телефоне само прячется в такую же панель.

## Установка

```ts
import { NuiDrawer } from '@numior/vue';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/drawer.css';
```

## Примеры

### Стороны

Свойство `side` выбирает край: `start`, `end` (по умолчанию), `top` или `bottom`. При письме справа
налево `start` и `end` меняются местами, а панели `top` и `bottom` занимают всю ширину экрана.

<Example name="drawer/Sides" />

`size` задаёт ширину боковой панели или наибольшую высоту верхней и нижней: `sm` — 16rem, `md` —
20rem, `lg` — 28rem. Размер `xl` (40rem) подходит для редактора, который открывается рядом со
страницей.

## Доступность

Свойства, слоты и событие `close` у панели те же, что у диалога. Экранный диктор при открытии
читает `title` и `description`, Esc и крестик закрывают панель, фокус возвращается на кнопку.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDrawer" />
