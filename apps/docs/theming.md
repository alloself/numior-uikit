# Темизация

Подключите `@numior/tokens/theme.css`. На корне документа или области задайте
`data-nui-theme="light|dark|system"`; по умолчанию используется системная схема.
Цвета используют CSS `light-dark()`, поэтому область должна наследовать
корректный `color-scheme`. Вложенная область с атрибутом темы начинает свой preset.

```html
<section
  data-nui-theme="dark"
  data-nui-density="compact"
  style="--nui-primary: #86efac; --nui-primary-foreground: #052e16"
>
  <!-- Компоненты этой области -->
</section>
```

Роли: `primary`, `secondary`, `success`, `warning`, `error`, `info` с парными
`*-foreground`; также `surface`, `surface-muted`, `text`, `text-muted`, `border`
и `focus`. Меняйте обе стороны цветовой пары и проверяйте контраст.
`--nui-radius`, `--nui-font`, `--nui-control-height`, `--nui-control-padding`
настраивают геометрию. Плотность: `comfortable` или `compact`.

## Независимые утилиты

Подключите `@numior/utilities/utilities.css`: `nui-flex`, `nui-wrap`,
`nui-items-center`, `nui-gap-2`, `nui-bg-surface`, `nui-bg-primary`,
`nui-text-primary-foreground`, `nui-text-muted`, `nui-rounded`.

## Tailwind 4

Интеграция опциональна. В consumer с настроенным Tailwind 4:

```css
@import 'tailwindcss';
@import '@numior/tokens/theme.css';
@import '@numior/tailwind/theme.css';
```

Используйте `bg-primary`, `text-primary-foreground`, `bg-surface`, `rounded-nui`.
`@theme inline` связывает их с CSS variables, поэтому runtime-темизация совпадает
с оформлением Vue-компонентов. Компоненты не требуют Tailwind или его preflight.

Перенос темы через portals/overlays будет реализован с соответствующими
примитивами; в основании пока проверяется обычная DOM-вложенность.
