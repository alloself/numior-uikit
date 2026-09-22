# Кнопка

`NuiButton` — нативная `<button>` с двумя осями оформления. `variant` задаёт форму:
`solid`, `soft`, `outline`, `ghost`, `link`. `tone` задаёт семантическую роль:
`primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`.
По умолчанию `solid` + `primary`. Цвета каждой роли берутся из токенов
`--nui-<role>`, поэтому runtime-смена акцента затрагивает все варианты сразу.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton>Сохранить</NuiButton>
  <NuiButton variant="soft" tone="success">Готово</NuiButton>
  <NuiButton variant="outline" tone="error">Удалить</NuiButton>
  <NuiButton variant="ghost" tone="neutral">Отмена</NuiButton>
  <NuiButton variant="link">Подробнее</NuiButton>
</div>

```vue
<script setup lang="ts">
import { NuiButton } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles/button.css';
</script>

<template>
  <NuiButton>Сохранить</NuiButton>
  <NuiButton variant="soft" tone="success">Готово</NuiButton>
  <NuiButton variant="outline" tone="error">Удалить</NuiButton>
  <NuiButton variant="ghost" tone="neutral">Отмена</NuiButton>
  <NuiButton variant="link">Подробнее</NuiButton>
</template>
```

`@numior/vue/styles.css` подключает стили всех компонентов, `@numior/vue/styles/button.css` —
только кнопки. CSS никогда не импортируется из JavaScript автоматически.

## Размеры

`size` выбирает ступень `sm`, `md` или `lg` внутри текущей шкалы; `data-nui-density`
сдвигает всю шкалу. Высоты: 2 / 2.5 / 3rem в `comfortable`, 1.75 / 2 / 2.5rem в `compact`.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton size="sm">Маленькая</NuiButton>
  <NuiButton>Обычная</NuiButton>
  <NuiButton size="lg">Большая</NuiButton>
</div>

## Состояния

`disabled` блокирует активацию. `loading` также блокирует кнопку, устанавливает
`aria-busy="true"` и показывает иконку `loader` из реестра иконок перед содержимым
слота. `type` по умолчанию `button`, поэтому кнопка внутри формы не отправляет её
случайно; доступны `submit` и `reset`.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton disabled>Недоступна</NuiButton>
  <NuiButton loading>Сохранение</NuiButton>
</div>

## Доступность

Компонент остаётся нативной кнопкой: клавиатура, фокус и screen reader работают
без дополнительного JavaScript. Кольцо фокуса рисуется через `--nui-focus`.
Кнопке без видимого текста нужно доступное имя, например `aria-label`. В темах
`light` и `dark` варианты `solid`, `soft`, `outline`, `ghost` и `link` проходят
автоматическую проверку контраста axe в playground; это не заменяет ручную проверку.

## API

| Prop       | Тип                                                                                    | По умолчанию |
| ---------- | -------------------------------------------------------------------------------------- | ------------ |
| `variant`  | `'solid' \| 'soft' \| 'outline' \| 'ghost' \| 'link'`                                  | `'solid'`    |
| `tone`     | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'` | `'primary'`  |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                                 | `'md'`       |
| `type`     | `'button' \| 'submit' \| 'reset'`                                                      | `'button'`   |
| `disabled` | `boolean`                                                                              | `false`      |
| `loading`  | `boolean`                                                                              | `false`      |

Слот по умолчанию — содержимое кнопки. Нативные атрибуты, классы и обработчики
событий передаются элементу `<button>`. Атрибуты `data-variant`, `data-tone` и
`data-size` доступны для стилизации и Tailwind-вариантов вида `data-[tone=error]:`.
