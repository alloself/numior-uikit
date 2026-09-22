# Начало работы

Это рабочее основание, не готовый релиз UI kit. Пакеты пока приватные и доступны
внутри workspace. Полный план редактора, таблиц, offline и остальных модулей
хранится в Archcore; эти возможности ещё не реализованы.

## Локальная разработка

Нужны Node 24.15+ и pnpm 10.31.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Документация: `pnpm build && pnpm docs:dev`. Проверки: `pnpm check`.
Браузеры: `pnpm exec playwright install`, затем `pnpm test:e2e`.

## Компонент и явные стили

```vue
<script setup lang="ts">
import { NuiButton } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';
</script>

<template>
  <NuiButton>Сохранить</NuiButton>
</template>
```

<div data-nui-theme="light" style="padding: 1rem">
  <NuiButton>Сохранить</NuiButton>
</div>

Компоненты стилизуются двумя осями: `variant` задаёт форму, `tone` — семантическую
роль, `size` — ступень внутри текущей плотности. Подробности и живые примеры —
в разделе «Компоненты», начиная с [кнопки](/components/button). Нативные
атрибуты, события и классы передаются корневому элементу. Контролам без видимого
текста необходимо доступное имя, например `aria-label`.

## Что уже проверяется

Нативная активация и блокировка кнопки, SSR-импорт пакета, выходные exports,
сборка CSS и деклараций, переключение тем, акцента и плотности, RTL,
опциональная Tailwind-интеграция и axe-проверка playground. Это не сертификация
всего будущего kit по WCAG и не проверка реальных мобильных устройств.
