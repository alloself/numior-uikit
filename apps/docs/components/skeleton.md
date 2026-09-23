# Скелетон

`NuiSkeleton` — декоративная заглушка на время загрузки: `aria-hidden`, мерцающий градиент
на токенах поверхности. Под `prefers-reduced-motion` мерцание отключается полностью, а
`animated="false"` делает то же явно.

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <div style="display: flex; gap: 0.75rem; align-items: center">
    <NuiSkeleton shape="circle" />
    <NuiSkeleton :lines="2" />
  </div>
  <NuiSkeleton shape="rect" height="5rem" />
  <NuiSkeleton width="40%" :animated="false" />
</div>

```vue
<div class="row">
  <NuiSkeleton shape="circle" />
  <NuiSkeleton :lines="2" />
</div>
<NuiSkeleton shape="rect" height="5rem" />
```

Скелетон не сообщает о загрузке сам: пометьте контейнер `aria-busy="true"` или используйте
`NuiProgress` с подписью, чтобы screen reader узнал о процессе.

## API

| Prop       | Тип                            | По умолчанию | Описание                            |
| ---------- | ------------------------------ | ------------ | ----------------------------------- |
| `shape`    | `'text' \| 'rect' \| 'circle'` | `'text'`     | Форма                               |
| `width`    | `string`                       | по форме     | Ширина (`--_inline-size`)           |
| `height`   | `string`                       | по форме     | Высота (`--_block-size`)            |
| `lines`    | `number`                       | `1`          | Строки для `text`; последняя короче |
| `animated` | `boolean`                      | `true`       | Мерцание                            |

Блок `nui-skeleton`, модификаторы `--shape-*`, `--static`; элемент `__line`.
