# Ссылка

`NuiLink` — ссылка на токенах ролей: по умолчанию `<a>`, через `as` и `to` — `RouterLink` или
`NuxtLink`. `tone` задаёт цвет, `underline` — когда показывать подчёркивание, `external`
открывает адрес в новой вкладке с `rel="noopener noreferrer"` и иконкой, `disabled` убирает
адрес и помечает ссылку `aria-disabled`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiLink href="#">Обычная ссылка</NuiLink>
  <NuiLink href="#" underline="hover" tone="neutral">Подчёркивание при наведении</NuiLink>
  <NuiLink href="https://lucide.dev" external>Внешняя</NuiLink>
  <NuiLink href="#" tone="error">Опасное действие</NuiLink>
  <NuiLink href="#" disabled>Недоступна</NuiLink>
</div>

```vue
<script setup lang="ts">
import { NuiLink } from '@numior/vue';
import '@numior/vue/styles/link.css';
</script>

<template>
  <p>Подробности в <NuiLink href="/docs">документации</NuiLink>.</p>
  <NuiLink href="https://lucide.dev" external>Lucide</NuiLink>
</template>
```

## Роутер

`as` принимает компонент ссылки, а `to` передаётся ему как есть. Если задан `to`, `href` не
рендерится, чтобы роутер сам управлял адресом. Тот же контракт используют пункты меню и
хлебные крошки.

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <NuiLink :as="RouterLink" to="/settings">Настройки</NuiLink>
</template>
```

## Доступность

Ссылка остаётся нативным `<a>`: клавиатура и screen reader работают без JavaScript. Ссылка в
тексте может быть любой высоты (WCAG 2.5.8 делает исключение для строчных ссылок), а
отдельно стоящие ссылки в навигации получают цель не меньше 24px — так сделано в
хлебных крошках. `disabled` не делает ссылку недоступной для чтения, только убирает
переход и фокус.

## API

| Prop        | Тип                             | По умолчанию | Описание                                  |
| ----------- | ------------------------------- | ------------ | ----------------------------------------- |
| `as`        | `string \| Component`           | `'a'`        | Элемент или компонент роутера             |
| `href`      | `string`                        | —            | Адрес для `<a>`                           |
| `to`        | `unknown`                       | —            | Назначение для роутера; побеждает `href`  |
| `tone`      | `NuiTone`                       | `'primary'`  | Цвет                                      |
| `underline` | `'always' \| 'hover' \| 'none'` | `'always'`   | Когда показывать подчёркивание            |
| `external`  | `boolean`                       | `false`      | Новая вкладка, `rel`, иконка              |
| `disabled`  | `boolean`                       | `false`      | Без адреса и фокуса, `aria-disabled=true` |

Блок `nui-link`, модификаторы `--tone-*`, `--underline-*`, `--disabled`; элемент `__icon`;
переменная `--_tone`.
