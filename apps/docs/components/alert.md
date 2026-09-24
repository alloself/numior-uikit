# Алерт

`NuiAlert` — статическое сообщение внутри страницы: `variant` задаёт форму (`soft`,
`outline`, `solid`), `tone` — роль и иконку из реестра. Для `tone="error"` элемент получает
`role="alert"`, остальные читаются как обычный текст.

<script setup>
import { ref } from 'vue'
const open = ref(true)
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiAlert title="Черновик сохранён" description="Синхронизация с сервером через минуту." />
  <NuiAlert tone="success" variant="outline" title="Проект опубликован" />
  <NuiAlert tone="warning" title="Черновик не сохранён" dismissible dismiss-label="Закрыть" v-model:open="open">
    Изменения пропадут при выходе со страницы.
    <template #actions><NuiButton size="sm" variant="outline" tone="warning" @click="open = false">Сохранить</NuiButton></template>
  </NuiAlert>
  <NuiButton v-if="!open" size="sm" variant="ghost" tone="neutral" @click="open = true">Показать снова</NuiButton>
  <NuiAlert tone="error" variant="solid" title="Не удалось подключиться" description="Проверьте сеть и повторите." />
</div>

```vue
<NuiAlert tone="warning" title="Черновик не сохранён" dismissible v-model:open="open">
  Изменения пропадут при выходе со страницы.
  <template #actions>
    <NuiButton size="sm" variant="outline" tone="warning">Сохранить</NuiButton>
  </template>
</NuiAlert>
```

`dismissible` добавляет кнопку закрытия: она переводит `v-model:open` в `false` и
генерирует событие `dismiss`. Закрытый алерт скрывается анимацией и остаётся в DOM;
уберите его через `v-if`, если нужно.

Действия внутри мягкого алерта берут `outline` или `solid`: `soft`-кнопка того же тона
сливается с фоном.

## API

| Prop           | Тип                              | По умолчанию | Описание                      |
| -------------- | -------------------------------- | ------------ | ----------------------------- |
| `variant`      | `'soft' \| 'outline' \| 'solid'` | `'soft'`     | Форма                         |
| `tone`         | `NuiTone`                        | `'info'`     | Роль, цвета и иконка          |
| `title`        | `string`                         | —            | Заголовок; слот `title`       |
| `description`  | `string`                         | —            | Текст; слот по умолчанию      |
| `icon`         | `IconAlias`                      | иконка тона  | Своя иконка                   |
| `hideIcon`     | `boolean`                        | `false`      | Без иконки                    |
| `dismissible`  | `boolean`                        | `false`      | Кнопка закрытия               |
| `dismissLabel` | `string`                         | `'Close'`    | Доступное имя кнопки закрытия |
| `v-model:open` | `boolean`                        | `true`       | Показан ли алерт              |

Событие `dismiss`. Слоты `title`, `default`, `actions`. Блок `nui-alert`, модификаторы
`--variant-*`, `--tone-*`, `--closed`; элементы `__icon`, `__body`, `__title`,
`__description`, `__actions`, `__close`.
