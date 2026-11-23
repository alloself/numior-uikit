<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/alloself/numior-uikit/raw/master/apps/docs/public/numior-ui-lockup-h-white.svg">
    <img alt="Numior UI" src="https://github.com/alloself/numior-uikit/raw/master/apps/docs/public/numior-ui-lockup-h.svg" height="40">
  </picture>
</div>

<p align="center">
  <a href="https://github.com/alloself/numior-uikit/actions/workflows/ci.yml"><img src="https://github.com/alloself/numior-uikit/actions/workflows/ci.yml/badge.svg?branch=master" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/vue-3.5%2B-42b883.svg" alt="Vue 3.5+">
  <img src="https://img.shields.io/badge/tailwind-4-38bdf8.svg" alt="Tailwind 4">
</p>

### 🖥️ Документация

Документация на русском и английском живёт на [ui.numior.ru](https://ui.numior.ru/), из
репозитория её запускает команда `pnpm docs:dev`.

### ⚡ Быстрый старт

До версии 1.0 пакеты выходят в npm как alpha с номерами `1.0.0-alpha.N`, и API между ними ещё
меняется:

```sh
pnpm add @numior/kit
```

Плагин Vite и стили подключаются по [руководству](https://ui.numior.ru/guide/getting-started).
Чтобы запустить кит из репозитория, нужны Node из `.node-version` и pnpm через Corepack:

```sh
git clone https://github.com/alloself/numior-uikit.git
cd numior-uikit
nvm install $(cat .node-version)
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Playground откроется на `http://localhost:5173`.

Приложение на Vite подключает кит плагином, стилями и плагином Vue:

```ts
import vue from '@vitejs/plugin-vue';
import { numior } from '@numior/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), numior()],
});
```

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';
```

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/kit';
import App from './App.vue';
import './style.css';

createApp(App)
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#app');
```

### 🚀 Введение

Numior UI — UI-кит для Vue 3.5+. Мы собираем на нём свои продукты: админку CMS, кабинеты,
редакторы. Когда чего-то не хватало, мы дописывали это сюда, а не в продукт.

- **Темы:** светлая, тёмная и системная схема, акцент и плотность задаются CSS-токенами.
- **Tailwind 4:** стили кита собираются вместе с Tailwind, а плагин Vite оставляет в CSS стили
  только тех компонентов, что есть в коде.
- **SSR и Nuxt:** компоненты рендерятся на сервере, для Nuxt 4 есть модуль `@numior/kit/nuxt` с
  автоимпортом.
- **Языки:** встроенные подписи на русском и английском, свои языки подключаются словарём.
- **RTL:** интерфейс разворачивается для письма справа налево на логических свойствах.
- **Доступность:** каждый компонент управляется с клавиатуры и проходит проверку axe в светлой и
  тёмной теме.

#### Поддержка браузеров

Две последние стабильные версии Chrome, Edge, Firefox и Safari на компьютерах и телефонах.
Каждое изменение проверяется в Chromium, Firefox и WebKit и в профилях телефонов на Android и
iOS. Полифилов в пакетах нет.

### 📦 Пакеты

Таблица, книга, редактор, графики и формы лежат в своих пакетах и не попадают в приложение,
пока их не импортируют.

| Пакет                   | Что внутри                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| `@numior/kit`           | Один пакет для приложения: все модули, плагин Vite и модуль Nuxt |
| `@numior/vue`           | Компоненты: поля, списки, окна, навигация и обратная связь       |
| `@numior/tokens`        | CSS-токены тем, плотности и акцентов                             |
| `@numior/primitives`    | Поведение без стилей: слои, списки, поля, даты и числа           |
| `@numior/tailwind`      | Пресет Tailwind 4 на токенах кита                                |
| `@numior/forms`         | Формы с правилами проверки и схемами Zod, Valibot или ArkType    |
| `@numior/table`         | Таблица на движке без Vue                                        |
| `@numior/spreadsheet`   | Книга с формулами и файлами XLSX                                 |
| `@numior/editor-vue`    | Редактор документов из блоков на ядре `@numior/editor-core`      |
| `@numior/content`       | Публикация документов редактора без его рантайма                 |
| `@numior/charts`        | Графики на SVG, по которым ходят с клавиатуры                    |
| `@numior/collaboration` | Совместная работа над документами и книгами                      |
| `@numior/offline`       | Работа без сети: журнал шагов и очередь отправки в IndexedDB     |
| `@numior/mcp`           | Сервер MCP со справочником кита для ИИ-ассистентов               |

Подробная карта пакетов и их зависимостей — в [packages/README.md](packages/README.md).

### 🙋 Вопросы и ошибки

Вопросы и сообщения об ошибках — в [Issues](https://github.com/alloself/numior-uikit/issues).

### 📝 Изменения

История изменений появится в [Releases](https://github.com/alloself/numior-uikit/releases) с
первым релизом. Правила версий — в [docs/releases.md](docs/releases.md).

### 💁 Участие

Как поднять окружение, какие проверки проходит изменение и как оно попадает в `master`, описано в
[CONTRIBUTING.md](CONTRIBUTING.md).

### 📑 Лицензия

Numior UI распространяется по лицензии [MIT](LICENSE).
