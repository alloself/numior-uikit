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

<div class="nui-demo" data-nui-theme="light">
  <NuiButton @click="toast.info('Черновик сохранён', { description: 'Синхронизация через минуту' })">Информация</NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Проект опубликован')">Успех</NuiButton>
  <NuiButton variant="outline" tone="error" @click="toast.error('Не удалось сохранить', { duration: 0, action: { label: 'Повторить', onClick: undo } })">Ошибка с действием</NuiButton>
  <NuiToaster label="Уведомления" close-label="Закрыть" />
</div>

```vue
<script setup lang="ts">
import { NuiButton, NuiToaster, useToast } from '@numior/vue';

const toast = useToast();
const save = () => toast.success('Проект опубликован');
</script>

<template>
  <NuiButton @click="save">Опубликовать</NuiButton>
  <NuiToaster label="Уведомления" close-label="Закрыть" />
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

## Поведение

Таймер ставится на пауза при наведении, при фокусе внутри уведомления и когда вкладка
скрыта. Esc закрывает сфокусированное уведомление и переводит фокус на соседнее;
уведомления никогда не забирают фокус при появлении. Уведомление, показанное поверх
открытого модального диалога, поднимается над ним, но остаётся инертным (нельзя нажать,
не озвучивается) до закрытия диалога — это поведение платформы.

## Своя раскладка

Слот региона получает `{ toasts, dismiss }`; `NuiToast` экспортируется как часть.

```vue
<NuiToaster placement="bottom" v-slot="{ toasts }">
  <ul class="my-stack">
    <li v-for="toast in toasts" :key="toast.id"><NuiToast :toast="toast" /></li>
  </ul>
</NuiToaster>
```

## API

`NuiToaster`: `placement` (`top-start | top | top-end | bottom-start | bottom | bottom-end`,
по умолчанию `top-end`), `label` (`aria-label` региона), `closeLabel`, `id`. На узких экранах
регион занимает всю ширину. Блок `nui-toaster` с модификаторами `--placement-*`.

`NuiToast`: `toast` (запись store), `closeLabel`. Блок `nui-toast`, модификаторы `--tone-*`,
`--leaving`; элементы `__icon`, `__body`, `__title`, `__description`, `__action`, `__close`;
переменные `--_tone`, `--_shift`.
