# Начало работы

Как подключить Numior UI к приложению на Vue 3.5+ и Vite. В Nuxt шаги другие, они описаны в
руководстве [SSR и Nuxt](/guide/ssr#nuxt).

## Установка

:::: steps

### Установите пакет

::: code-group

```sh [pnpm]
pnpm add @numior/kit
```

```sh [npm]
npm install @numior/kit
```

```sh [yarn]
yarn add @numior/kit
```

```sh [bun]
bun add @numior/kit
```

:::

В пакете все компоненты и модули, а модуль вроде `@numior/kit/table` попадает в сборку, только
если приложение его импортирует.

### Добавьте плагин Vite

Плагин подключает Tailwind 4 и оставляет в CSS стили только тех компонентов, что есть в коде:

```ts
import vue from '@vitejs/plugin-vue';
import { numior } from '@numior/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), numior()],
});
```

### Подключите стили

Добавьте Tailwind и Numior UI в CSS-файл приложения, например `src/style.css`:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';
```

### Подключите CSS и плагин Vue

Плагин `createNuiConfig` задаёт язык встроенных подписей, остальные его настройки описаны в
[Конфигурации](/guide/configuration):

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/kit';
import App from './App.vue';
import './style.css';

createApp(App)
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#app');
```

### Используйте компоненты

Импортируйте компоненты из `@numior/kit` и используйте их в шаблоне:

<Example name="guide/First" />

::::

## Дальше

- [Tailwind](/guide/tailwind) — как устроены стили и как настроить тему.
- [Button](/components/button) — кнопка с живым конфигуратором и полным API.
- [Темы оформления](/guide/theming) — светлая и тёмная схема, акценты и плотность.
- [Локализация](/guide/localization) — словари и переводы встроенных подписей.
