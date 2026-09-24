# Выдвижная панель

`NuiDrawer` — тот же нативный модальный `<dialog>`, что и [диалог](/components/dialog),
но прижатый к краю экрана. Сторона задаётся логически: `start` и `end` меняются местами
в RTL, `top` и `bottom` занимают всю ширину.

<script setup>
import { ref } from 'vue'
const open = ref(false)
const side = ref('end')
</script>

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiButton @click="open = true">Открыть панель</NuiButton>
  <label>Сторона
    <select v-model="side">
      <option value="end">end</option>
      <option value="start">start</option>
      <option value="top">top</option>
      <option value="bottom">bottom</option>
    </select>
  </label>
  <NuiDrawer v-model:open="open" :side="side" title="Фильтры" description="Настройки списка">
    <NuiField label="Поиск">
      <NuiInput placeholder="Название" />
    </NuiField>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Сбросить</NuiButton>
      <NuiButton @click="open = false">Применить</NuiButton>
    </template>
  </NuiDrawer>
</div>

```vue
<NuiDrawer v-model:open="open" side="end" title="Фильтры">
  <NuiField label="Поиск">
    <NuiInput />
  </NuiField>
  <template #footer>
    <NuiButton @click="open = false">Применить</NuiButton>
  </template>
</NuiDrawer>
```

Панель принимает все props, слоты и событие `close` диалога. `size` задаёт ширину для
`start`/`end` (16 / 20 / 28rem) и максимальную высоту для `top`/`bottom`. Появление —
сдвиг с соответствующего края через `@starting-style`.

## API

| Prop   | Тип                                     | По умолчанию | Описание    |
| ------ | --------------------------------------- | ------------ | ----------- |
| `side` | `'start' \| 'end' \| 'top' \| 'bottom'` | `'end'`      | Край экрана |

Остальные props — как у `NuiDialog`. Корневой элемент несёт классы `nui-dialog` и
`nui-drawer` с модификаторами `nui-drawer--side-*` и `nui-drawer--size-*`; переменные
`--_size` и `--_shift`.
