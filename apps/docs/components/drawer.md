# Drawer

`NuiDrawer` — тот же модальный `<dialog>`, что и [Dialog](/components/dialog), но прижатый к
краю экрана. Сторона задаётся логически: `start` и `end` меняются местами в RTL, `top` и
`bottom` занимают всю ширину.

<Example name="drawer/Filters" />

## Установка

```ts
import { NuiDrawer } from '@numior/vue';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/drawer.css';
```

## Примеры

### Стороны

`size` задаёт ширину для `start` и `end` и максимальную высоту для `top` и `bottom`; панель
выезжает со своего края. Кроме шагов диалога `sm`, `md` и `lg` у панели есть `xl` (40rem) — для
редактора, который открывается рядом со страницей.

<Example name="drawer/Sides" />

## Доступность

Панель принимает пропы, слоты и событие `close` диалога: заголовок и описание связаны через
`aria-labelledby` и `aria-describedby`, Esc и крест закрывают её, фокус возвращается на кнопку.

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDrawer" />
