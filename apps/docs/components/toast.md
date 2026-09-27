# Уведомления

Уведомления показываются императивно: `useToast()` возвращает сервис, а один `<NuiToaster>`
на приложение рендерит очередь. Регион живёт в top layer как всегда открытый
`popover="manual"` с `aria-live="polite"`, поэтому уведомления озвучиваются и остаются
над остальными слоями. Позиция по умолчанию `top-end`, длительность 5 секунд для всех
тонов, лимита видимых нет.

<script setup>
import { useToast } from '@numior/vue'
const toast = useToast()
const undo = () => toast.success('Удаление отменено')
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton @click="toast.info('Черновик сохранён', { description: 'Синхронизация через минуту' })">Информация</NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Проект опубликован')">Успех</NuiButton>
  <NuiButton variant="outline" tone="error" @click="toast.error('Не удалось сохранить', { duration: 0, action: { label: 'Повторить', onClick: undo } })">Ошибка с действием</NuiButton>
  <NuiToaster />
</div>

```vue
<script setup lang="ts">
import { NuiButton, NuiToaster, useToast } from '@numior/vue';

const toast = useToast();
const save = () => toast.success('Проект опубликован');
</script>

<template>
  <NuiButton @click="save">Опубликовать</NuiButton>
  <NuiToaster />
</template>
```

## Установка

Подключите плагин `createNuiConfig`, чтобы у каждого приложения (и каждого SSR-запроса)
был свой store уведомлений, и поставьте один `<NuiToaster>` ближе к концу корневого
компонента. Без плагина используется общий клиентский store — удобно для playground, но
не для SSR.

```ts
import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';

createApp(App)
  .use(createNuiConfig({ toasts: { duration: 4000 } }))
  .mount('#app');
```

Опции store: `duration` (по умолчанию 5000 мс), `exitDuration` (200 мс, равен
`--nui-duration-normal`), `limit` (максимум видимых; остальные ждут в очереди).

## Сервис

`useToast()` вызывается в `setup()` компонента или через `app.runWithContext`. Методы:
`show(options)`, `success(title, options)`, `error(...)`, `warning(...)`, `info(...)`,
`dismiss(id)`, `clear()`. `show` возвращает id; повторный `show` с тем же `id` заменяет
уведомление и перезапускает таймер.

| Опция         | Тип                                              | Описание                                             |
| ------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `title`       | `string`                                         | Заголовок                                            |
| `description` | `string`                                         | Дополнительный текст                                 |
| `tone`        | `neutral \| info \| success \| warning \| error` | Тон, иконка и `role="alert"` для `error`             |
| `duration`    | `number`                                         | Мс до автозакрытия, `0` — до закрытия пользователем  |
| `action`      | `{ label, onClick }`                             | Кнопка действия; после клика уведомление закрывается |
| `dismissible` | `boolean`                                        | Кнопка закрытия (по умолчанию `true`)                |
| `id`          | `string`                                         | Стабильный id для замены                             |

## Стопка

Новое уведомление появляется у края и становится верхним; предыдущие уходят за него
уменьшенными карточками, из-под верхнего видны две. Наведение или фокус внутри региона
раскрывает стопку в список с зазором, а `expand` держит её раскрытой всегда. Высоты
карточек измеряются через `ResizeObserver`, поэтому перестроение движется по
`--nui-duration-slow`, вход и уход — по `--nui-duration-normal`.

## Поведение

Пока стопка под курсором или содержит фокус, таймеры всех уведомлений стоят; они стоят и
когда вкладка скрыта. Esc закрывает сфокусированное уведомление и переводит фокус на соседнее;
уведомления никогда не забирают фокус при появлении. Уведомление, показанное поверх
открытого модального диалога, поднимается над ним, но остаётся инертным (нельзя нажать,
не озвучивается) до закрытия диалога — это поведение платформы.

## Своя карточка

Слот вызывается для каждого уведомления с `{ toast, dismiss }` внутри элемента стопки,
поэтому позиционирование, наложение и движение остаются за регионом. `NuiToast`
экспортируется как часть, если нужно обернуть стандартную карточку.

```vue
<NuiToaster placement="bottom" v-slot="{ toast, dismiss }">
  <article class="my-toast">
    <strong>{{ toast.title }}</strong>
    <button type="button" @click="dismiss">Скрыть</button>
  </article>
</NuiToaster>
```

## API

`NuiToaster`: `placement` (`top-start | top | top-end | bottom-start | bottom | bottom-end`,
по умолчанию `top-end`), `expand` (стопка всегда раскрыта), `label` (`aria-label` региона,
[словарь](/guide/localization#toast): «Уведомления»), `closeLabel`, `id`. На узких экранах регион занимает всю ширину. Блок `nui-toaster` с
модификаторами `--placement-*` и `--expanded`, элемент `__item` с модификаторами `--behind`
и `--leaving`; переменные региона `--_inset`, `--_width`, `--_gap`, `--_peek`,
`--_direction`, `--_front-size`, элемента — `--_index`, `--_offset`, `--_size`.

`NuiToast`: `toast` (запись store), `closeLabel`. Блок `nui-toast`, модификаторы `--tone-*`,
`--leaving`; элементы `__icon`, `__body`, `__title`, `__description`, `__action`, `__close`;
переменная `--_tone`.
