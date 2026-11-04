# Начало работы

Как установить и настроить Numior UI в проекте на Vue 3.5+.

## Установка

Установите компоненты и темы:

```sh
pnpm add @numior/vue @numior/tokens
```

Формы и пресет для Tailwind ставятся отдельно: это пакеты `@numior/forms` и `@numior/tailwind`.

## Стили

Подключите стили в точке входа приложения:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
```

Если стили приложения собираются в CSS-файле, подключите их там:

```css
@import '@numior/tokens/theme.css';
@import '@numior/tokens/base.css';
@import '@numior/vue/styles.css';
```

В `theme.css` лежат цвета, отступы и скругления светлой и тёмной темы. `base.css` задаёт странице
фон, шрифт и цвет текста. `styles.css` содержит стили всех компонентов.

Чтобы не грузить лишнее, подключите вместо `styles.css` файлы только нужных компонентов, например
`@numior/vue/styles/button.css`. Путь к файлу указан на странице каждого компонента. Составным
компонентам нужны и файлы их частей: `NuiSelect` использует `NuiButton` и `NuiList`.

## Первый компонент

Импортируйте компоненты из `@numior/vue` и используйте их в шаблоне:

<Example name="guide/First" />

Свойство `variant` меняет оформление компонента, `tone` — цвет, `size` — размер. Атрибуты и
обработчики событий, которые вы передаёте компоненту, попадают на его корневой элемент.

Поля ввода выводят подпись, подсказку и текст ошибки из свойств `label`, `description` и `error`.
Обёртка `NuiField` нужна, только если подпись свёрстана своей разметкой или в поле несколько
контролов.

## Плагин

Подключите плагин `createNuiConfig`, чтобы задать язык встроенных подписей вроде «Закрыть» и
«Нет вариантов», тему, иконки и направление письма:

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import App from './App.vue';

createApp(App)
  .use(createNuiConfig({ locale: 'ru-RU', colorScheme: { storageKey: 'theme' } }))
  .mount('#app');
```

С такой настройкой подписи будут на русском, а тема, которую выберет пользователь, сохранится в
`localStorage` под ключом `theme`. Без плагина компоненты тоже работают: подписи на английском,
тема как в системе.

## Тема и плотность

Тему и плотность задают атрибуты на `<html>`:

```html
<html data-nui-theme="dark" data-nui-density="compact"></html>
```

`data-nui-theme` принимает `light`, `dark` или `system`, где `system` повторяет настройку
системы. `data-nui-density="compact"` уменьшает высоту контролов и отступы, по умолчанию стоит
`comfortable`. Атрибуты работают на любом элементе, и тогда тема или плотность меняются только
внутри него.

## Дальше

- [Button](/components/button) — кнопка с живым конфигуратором и полным API.
- [Темы оформления](/guide/theming) — токены, акценты и свои темы.
- [Локализация](/guide/localization) — словари и переводы встроенных подписей.
