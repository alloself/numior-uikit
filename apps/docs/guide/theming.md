# Темизация

Тема — набор CSS-токенов из `@numior/tokens/theme.css`. Атрибут `data-nui-theme` на корне
или на любой области выбирает `light`, `dark` или `system`; цвета записаны через
`light-dark()`, поэтому область наследует правильный `color-scheme`. Публичный контракт —
только семантические токены `--nui-*`.

<Example name="guide/Scheme" />

## Установка

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/tokens/accents.css';
```

`base.css` убирает поля `body` и задаёт фон, цвет и шрифт страницы из токенов; `accents.css`
добавляет пресеты акцента и нужен только вместе с `data-nui-accent`.

## Переключение схемы

`useColorScheme` управляет атрибутом `data-nui-theme`: читает сохранённый выбор, следит за
`prefers-color-scheme` и пишет изменения обратно. С опцией `colorScheme` в
`createNuiConfig` схема общая для всего приложения, и `useColorScheme()` без аргументов
возвращает её; с аргументами создаётся отдельная схема для области `scope`.

```vue
<template>
  <NuiButton variant="ghost" tone="neutral" :aria-label="texts[scheme]" @click="cycle()">
    <NuiIcon :alias="icons[resolved]" />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, useColorScheme } from '@numior/vue';

const { scheme, resolved, cycle } = useColorScheme();
const icons = { light: 'sun', dark: 'moon' } as const;
const texts = { light: 'Светлая тема', dark: 'Тёмная тема', system: 'Системная тема' };
</script>
```

`scheme` хранит выбор (`light`, `dark`, `system`), `resolved` — фактическую схему, `set`,
`toggle` и `cycle` меняют её. Чтобы страница не мигала до гидрации, вставьте в `<head>`
скрипт `colorSchemeScript(storageKey)`: он ставит сохранённую схему до первой отрисовки.

## Акцент

`data-nui-accent` меняет пару `--nui-primary` и `--nui-primary-foreground` вместе с
производными: `indigo`, `blue`, `violet`, `emerald`, `teal`, `rose`, `orange`, `amber`,
`slate`.

<Example name="guide/Accent" />

## Свои цвета

Производные состояния (`soft`, hover, active, фокус) вычисляются через `color-mix()` от
токена роли, поэтому достаточно заменить пару `--nui-<role>` и `--nui-<role>-foreground`.
Переопределяйте токены на элементе с `data-nui-theme` или на `:root`. `var()` внутри
custom property вычисляется там, где она объявлена, поэтому на обычном элементе
унаследованные `--nui-primary-soft` и `--nui-focus` останутся старыми.

```css
[data-nui-theme] {
  --nui-primary: light-dark(oklch(0.55 0.2 300), oklch(0.8 0.12 300));
  --nui-primary-foreground: light-dark(oklch(1 0 0), oklch(0.25 0.08 300));
  --nui-radius-base: 0.75rem;
}
```

Радиусы выводятся из `--nui-radius-base`: `sm` — половина, `lg` — полтора, `xl` — два.

## Плотность

`data-nui-density="comfortable|compact"` сдвигает шкалу высот, отступов и шрифтов
контролов; проп `size` выбирает ступень внутри шкалы. Атрибут наследуется, поэтому таблица
или боковая панель могут быть компактнее страницы.

<Example name="guide/Density" />

## Токены

| Группа      | Токены                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Поверхности | `--nui-surface`, `-muted`, `-elevated`, `-overlay`, `--nui-ring`, `--nui-backdrop`, `--nui-surface-code`                                                             |
| Текст       | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`, `--nui-code-inline`                                                                                           |
| Границы     | `--nui-border`, `--nui-border-strong`                                                                                                                                |
| Роли        | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `-foreground`, `-soft`, `-soft-foreground`                                 |
| Фокус       | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`, `--nui-disabled-opacity`                                                                         |
| Форма       | `--nui-radius-base`, `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-xl`, `--nui-radius-full`, `--nui-radius`                                 |
| Отступы     | `--nui-space-1…6`, `--nui-space-8` (шаг 0.25rem)                                                                                                                     |
| Типографика | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs…4xl`, `--nui-font-weight-*`, `--nui-line-height`, `-tight`, `-relaxed`, `--nui-tracking-tight`, `--nui-measure` |
| Код         | `--nui-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`         |
| Тени        | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                              |
| Движение    | `--nui-duration-fast`, `--nui-duration-normal`, `--nui-duration-slow`, `--nui-easing`; при `prefers-reduced-motion` длительности равны 0                             |
| Слои        | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                               |
| Контролы    | `--nui-control-height-*`, `--nui-control-padding-*`, `--nui-field-padding-*`, `--nui-control-font-size-*` для `sm`, `md`, `lg` и текущей ступени                     |

Слои (`NuiDialog`, `NuiDrawer`, `NuiPopover`, `NuiTooltip`) остаются в DOM инициатора и
наследуют его тему, плотность и `dir` в top layer.
