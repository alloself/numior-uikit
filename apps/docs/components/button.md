# Кнопка

`NuiButton` — нативная `<button>` с двумя осями оформления. `variant` задаёт форму:
`solid`, `soft`, `outline`, `ghost`, `link`. `tone` задаёт семантическую роль:
`primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`.
По умолчанию `solid` + `primary`. Цвета каждой роли берутся из токенов
`--nui-<role>`, поэтому runtime-смена акцента затрагивает все варианты сразу.

<Example name="button/Basic" />

`@numior/vue/styles.css` подключает стили всех компонентов, `@numior/vue/styles/button.css` —
только кнопки. CSS никогда не импортируется из JavaScript автоматически.

## Размеры

`size` выбирает ступень `sm`, `md` или `lg` внутри текущей шкалы; `data-nui-density`
сдвигает всю шкалу. Высоты: 2 / 2.5 / 3rem в `comfortable`, 1.75 / 2 / 2.5rem в `compact`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton size="sm">Маленькая</NuiButton>
  <NuiButton>Обычная</NuiButton>
  <NuiButton size="lg">Большая</NuiButton>
</div>

## Состояния

`disabled` блокирует активацию. `loading` тоже гасит нажатия, но кнопка остаётся
фокусируемой: вместо `disabled` она получает `aria-disabled="true"` и `aria-busy="true"`, клик
отменяется, поэтому нажатая кнопка отправки не теряет фокус и форма не уходит второй раз.
Содержимое прячется через `opacity`, иконка `loader` из реестра встаёт поверх по центру, и
ширина кнопки не меняется. `type` по умолчанию
`button`, поэтому кнопка внутри формы не отправляет её случайно; доступны `submit` и `reset`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton disabled>Недоступна</NuiButton>
  <NuiButton loading>Сохранение</NuiButton>
</div>

## Только иконка

Кнопка, в слоте которой только `NuiIcon`, становится квадратной сама: ширина равна высоте
ступени, горизонтальные отступы убираются, содержимое центрируется. `icon-only`
принудительно включает режим, `:icon-only="false"` отключает. Такой кнопке обязателен
`aria-label`.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton aria-label="Закрыть"><NuiIcon alias="x" /></NuiButton>
  <NuiButton variant="outline" tone="neutral" size="sm" aria-label="Закрыть"><NuiIcon alias="x" /></NuiButton>
  <NuiButton variant="ghost" tone="neutral" size="lg" aria-label="Закрыть"><NuiIcon alias="x" /></NuiButton>
</div>

```vue
<NuiButton variant="ghost" tone="neutral" aria-label="Закрыть">
  <NuiIcon alias="x" />
</NuiButton>
```

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
| `iconOnly` | `boolean`                                                                              | авто         |

Слот по умолчанию — содержимое кнопки. Нативные атрибуты, классы и обработчики
событий передаются элементу `<button>`. Оформление построено на BEM: блок `nui-button`,
элементы `nui-button__content`, `nui-button__loader`, `nui-button__spinner`,
модификаторы `nui-button--variant-soft`, `nui-button--tone-error`, `nui-button--size-sm`,
`nui-button--icon-only` и `nui-button--loading`. Модификаторы задают приватные CSS-переменные (`--_tone`,
`--_height`), которые читают остальные правила, поэтому свой вариант — это ещё один
класс-модификатор.
