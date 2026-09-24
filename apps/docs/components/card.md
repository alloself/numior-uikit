# Карточка

`NuiCard` — контейнер на поверхности: `variant` задаёт вид (`outline`, `elevated`, `soft`),
`padding` — внутренний отступ. Содержимое собирается из частей `NuiCardHeader` (слот
`actions`), `NuiCardTitle` (тег `as`, по умолчанию `h3`), `NuiCardDescription`,
`NuiCardContent`, `NuiCardFooter` и `NuiCardMedia` (картинка в обрез до края, `aspect`).
Пропы `title` и `description` рисуют шапку без частей. `href`/`to` или `interactive`
превращают карточку в ссылку или кнопку целиком.

<div class="vp-raw nui-demo" data-nui-theme="light" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); align-items: start">
  <NuiCard href="#card">
    <NuiCardMedia src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='100' fill='url(%23g)'/%3E%3C/svg%3E" alt="" aspect="3 / 1" />
    <NuiCardHeader>
      <NuiCardTitle>Тариф Team</NuiCardTitle>
      <NuiCardDescription>Вся карточка — одна ссылка.</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardFooter><NuiBadge tone="success">Доступен</NuiBadge></NuiCardFooter>
  </NuiCard>
  <NuiCard interactive variant="elevated">
    <NuiCardHeader>
      <NuiCardTitle>Проект Numior</NuiCardTitle>
      <NuiCardDescription>Карточка-кнопка с независимым действием в шапке.</NuiCardDescription>
      <template #actions>
        <NuiButton variant="ghost" tone="neutral" size="sm" aria-label="Ещё"><NuiIcon alias="ellipsis" /></NuiButton>
      </template>
    </NuiCardHeader>
    <NuiCardContent>Открыть проект можно кликом в любом месте.</NuiCardContent>
  </NuiCard>
  <NuiCard variant="soft" padding="sm" title="Тихая карточка" description="Без интерактива, с отступом sm">
    <NuiCardContent>Содержимое</NuiCardContent>
  </NuiCard>
</div>

```vue
<script setup lang="ts">
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
} from '@numior/vue';
import '@numior/vue/styles/card.css';
</script>

<template>
  <NuiCard :to="{ name: 'plan', params: { id } }" :as="RouterLink">
    <NuiCardMedia :src="plan.cover" alt="" />
    <NuiCardHeader>
      <NuiCardTitle>{{ plan.name }}</NuiCardTitle>
      <NuiCardDescription>{{ plan.summary }}</NuiCardDescription>
      <template #actions><NuiButton size="sm" variant="ghost" aria-label="Ещё" /></template>
    </NuiCardHeader>
    <NuiCardContent>…</NuiCardContent>
  </NuiCard>
</template>
```

## Интерактивная карточка

Кликабельная карточка не оборачивается в `<a>` или `<button>` целиком: имя такой ссылки
превратилось бы в весь текст карточки, а вложенные кнопки стали бы невалидными. Вместо
этого `NuiCardTitle` рендерит внутри заголовка единственный фокусируемый элемент —
`NuiLink` (при `href`/`to`, роутер через `as`) или `<button>` (при `interactive`) — и
растягивает его псевдоэлементом на всю карточку. Имя ссылки равно заголовку, поэтому
интерактивной карточке нужен `NuiCardTitle` или проп `title`. Контролы в `actions` и
`footer` поднимаются над растянутой областью и работают независимо; `@click` на `NuiCard`
получает и клик по поверхности (через действие), и клики вложенных кнопок — различайте их
по `event.target.closest('.nui-card__action')`. Кольцо фокуса рисуется на всей карточке.

## API

| Prop          | Тип                                 | По умолчанию | Описание                                   |
| ------------- | ----------------------------------- | ------------ | ------------------------------------------ |
| `variant`     | `'outline' \| 'elevated' \| 'soft'` | `'outline'`  | Вид поверхности                            |
| `padding`     | `'sm' \| 'md' \| 'lg'`              | `'md'`       | Внутренний отступ                          |
| `href`, `to`  | `string`, `unknown`                 | —            | Делает карточку ссылкой (`to` для роутера) |
| `as`          | `string \| Component`               | `'a'`        | Компонент роутера для `to`                 |
| `interactive` | `boolean`                           | `false`      | Карточка-кнопка                            |
| `title`       | `string`                            | —            | Заголовок без частей                       |
| `description` | `string`                            | —            | Описание без частей                        |

`NuiCardTitle`: `as` — `h2`…`h6` (`'h3'`). `NuiCardMedia`: `src`, `alt` (`''`), `aspect`
(`'16 / 9'`), слот вместо картинки (по умолчанию иконка `image`). Блок `nui-card`,
модификаторы `--variant-*`, `--padding-*`, `--interactive`; элементы `__header`, `__heading`,
`__actions`, `__title`, `__action`, `__description`, `__content`, `__footer`, `__media`,
`__image`, `__placeholder`; переменные `--_padding`, `--_gap`, `--_radius`, `--_surface`,
`--_border`, `--_shadow`, `--_aspect`.
