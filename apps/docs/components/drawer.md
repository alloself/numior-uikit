# Drawer

Панель, которая выезжает с края экрана поверх страницы.

<Example name="drawer/Filters" />

Постоянное меню приложения собирайте из [Sidebar](/components/sidebar).

## Установка

```ts
import { NuiDrawer } from '@numior/kit';
```

## Использование

Откройте панель и поменяйте край экрана, ширину и способы закрытия.

<Configurator name="NuiDrawer" />

## Примеры

### Собрать форму в панели

Положите кнопки в слот `footer`.

<Example name="drawer/Form" />

Кнопка в подвале связана с формой атрибутом `form`, поэтому Enter в поле тоже сохраняет клиента.

## Доступность

Свойства, событие `close` и работа с фокусом у панели те же, что у [Dialog](/components/dialog).

<KeyboardReference name="NuiDialog" />

## API

<ApiReference name="NuiDrawer" />
