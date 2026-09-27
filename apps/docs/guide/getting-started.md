# Начало работы

Numior UI — набор компонентов для Vue 3.5+ с явными стилями, общими токенами и поддержкой SSR.
Пакеты пока приватные и доступны внутри workspace.

## Установка

```sh
pnpm add @numior/vue @numior/tokens
```

`@numior/tokens` даёт темы и токены, `@numior/vue` — компоненты. Формы живут в `@numior/forms`,
утилиты вёрстки — в `@numior/utilities`.

## Стили

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
```

`base.css` обнуляет отступы `body`, задаёт фон, цвет текста и шрифт страницы из токенов.
`styles.css` подключает стили всех компонентов; страница компонента показывает его собственный
файл `@numior/vue/styles/<компонент>.css`. CSS никогда не импортируется из JavaScript сам.

## Первый компонент

<Example name="guide/First" />

Компоненты стилизуются двумя осями: `variant` задаёт форму, `tone` — роль, `size` — ступень внутри
плотности. Нативные атрибуты, события и классы уходят корневому элементу. Контролы форм рисуют
`label`, `description` и `error` сами; `NuiField` нужен для слотов и нескольких контролов в одном поле.

## Настройка приложения

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import App from './App.vue';

createApp(App)
  .use(createNuiConfig({ locale: 'ru-RU', colorScheme: { storageKey: 'theme' } }))
  .mount('#app');
```

Плагин задаёт язык встроенных текстов, общую цветовую схему, иконки и направление письма.
Без него компоненты работают на английских текстах и системной схеме.

## Темы и плотность

```html
<html data-nui-theme="dark" data-nui-density="compact"></html>
```

`data-nui-theme` принимает `light`, `dark` и `system`, `data-nui-density` — `comfortable` и
`compact`. Оба атрибута работают на любом элементе, не только на корне.

## Дальше

- [Button](/components/button) — первый компонент с конфигуратором и API.
- [Темизация](/guide/theming) — токены, акценты и свои темы.
- [Локализация](/guide/localization) — словари и переводы встроенных текстов.
