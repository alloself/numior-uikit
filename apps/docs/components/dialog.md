# Диалог

`NuiDialog` — нативный `<dialog>`, открываемый через `showModal()`. Браузер сам держит
фокус внутри, делает фон инертным, закрывает по Esc, рисует `::backdrop` и возвращает
фокус на инициатор. Элемент остаётся в DOM там, где вы его написали, поэтому тема,
плотность и направление письма наследуются без Teleport и `z-index`.

<script setup>
import { ref } from 'vue'
const open = ref(false)
const result = ref('')
const strict = ref(false)
</script>

<div class="nui-demo" data-nui-theme="light">
  <NuiButton @click="open = true">Удалить проект</NuiButton>
  <span>Результат: {{ result || '—' }}</span>
  <NuiDialog v-model:open="open" title="Удалить проект?" description="Действие нельзя отменить." @close="result = $event">
    <p>Все данные проекта будут удалены вместе с историей изменений.</p>
    <template #footer>
      <form method="dialog" class="nui-flex nui-gap-2">
        <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Отмена</NuiButton>
        <NuiButton type="submit" value="confirm" tone="error">Удалить</NuiButton>
      </form>
    </template>
  </NuiDialog>
</div>

```vue
<NuiDialog
  v-model:open="open"
  title="Удалить проект?"
  description="Действие нельзя отменить."
  @close="result = $event"
>
  <p>Все данные проекта будут удалены.</p>
  <template #footer>
    <form method="dialog" class="nui-flex nui-gap-2">
      <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Отмена</NuiButton>
      <NuiButton type="submit" value="confirm" tone="error">Удалить</NuiButton>
    </form>
  </template>
</NuiDialog>
```

Форма с `method="dialog"` закрывает диалог нативно; событие `close` отдаёт `returnValue`,
равный `value` нажатой кнопки. Без формы закрывайте через `v-model:open` или кнопку с крестом.

## Обязательный диалог

`closable: false` убирает крест, не даёт закрыть по Esc и клику по фону. Такой диалог
закрывается только вашей кнопкой. В Chromium повторное нажатие Esc без нового
действия пользователя всё же закроет диалог по правилам close watcher, поэтому считайте
это подсказкой, а не запретом.

<div class="nui-demo" data-nui-theme="light">
  <NuiButton variant="outline" @click="strict = true">Открыть</NuiButton>
  <NuiDialog v-model:open="strict" :closable="false" title="Подтвердите условия">
    <p>Продолжить можно только после подтверждения.</p>
    <template #footer>
      <NuiButton @click="strict = false">Подтверждаю</NuiButton>
    </template>
  </NuiDialog>
</div>

## Несколько уровней

Диалог, открытый поверх другого модального диалога, встаёт выше него в top layer, и
затемняющий слой всегда один — под верхним диалогом стопки. Перекрытые диалоги получают
модификатор `nui-dialog--covered` с прозрачным `::backdrop`, поэтому первый диалог
оказывается под оверлеем второго; когда верхний закрывается, оверлей возвращается к
следующему. Esc закрывает только верхний уровень, а фокус возвращается к кнопке, которая
его открыла.

## Top layer и движение

Открытый диалог живёт в top layer: его не режет `overflow` предков и не перекрывают
соседи с `z-index`. Пока диалог модальный, `html` получает `overflow: hidden` со
`scrollbar-gutter: stable`. Появление анимируется через `@starting-style` и
`transition-behavior: allow-discrete`; выход анимируется там, где браузер поддерживает
`overlay`-transition (Chromium), в остальных — закрывается мгновенно. Под
`prefers-reduced-motion` длительности равны нулю.

## Доступность

`title` и `description` (или одноимённые слоты) связываются через `aria-labelledby` и
`aria-describedby` с id, известными уже на сервере. Первым фокус получает первый
интерактивный элемент тела, кнопка закрытия идёт последней в DOM. Кнопке закрытия нужен
`closeLabel` на языке интерфейса.

## API

| Prop              | Тип                    | По умолчанию | Описание                                     |
| ----------------- | ---------------------- | ------------ | -------------------------------------------- |
| `v-model:open`    | `boolean`              | `false`      | Открыт ли диалог                             |
| `id`              | `string`               | генерируется | Id элемента; от него образуются id заголовка |
| `title`           | `string`               | —            | Заголовок; слот `title`                      |
| `description`     | `string`               | —            | Описание; слот `description`                 |
| `size`            | `'sm' \| 'md' \| 'lg'` | `'md'`       | Ширина 24 / 32 / 48rem                       |
| `closable`        | `boolean`              | `true`       | Крест, Esc и клик по фону                    |
| `closeOnBackdrop` | `boolean`              | `true`       | Закрытие кликом по фону при `closable`       |
| `closeLabel`      | `string`               | `'Close'`    | Доступное имя кнопки закрытия                |

Событие `close(returnValue: string)`. Слоты: `default`, `title`, `description`, `footer`.
Модификаторы `nui-dialog--size-*`; элементы `__header`, `__title`, `__description`,
`__body`, `__footer`, `__close`; переменные `--_width`, `--_padding`. Композаблы
`useDialog` и `useControlId` экспортируются для собственных слоёв.
