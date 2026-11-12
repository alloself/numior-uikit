# Toggle group

Ряд кнопок, из которых нажата одна или несколько.

<Example name="toggle-group/Basic" />

Опишите кнопки в `items`; нажатая приходит в `v-model`.

## Установка

```ts
import { NuiToggleGroup } from '@numior/vue';
import '@numior/vue/styles/toggle-group.css';
```

## Использование

Поменяйте вид, размер и направление группы или оставьте на кнопках одни иконки.

<Configurator name="NuiToggleGroup" />

## Примеры

### Нажать несколько кнопок

Добавьте `multiple`.

<Example name="toggle-group/Multiple" />

Значения нажатых кнопок приходят массивом в `v-model:values`.

## Доступность

| Режим          | Группа       | Кнопки                    |
| -------------- | ------------ | ------------------------- |
| Без `multiple` | `radiogroup` | `radio` с `aria-checked`  |
| С `multiple`   | `group`      | `button` с `aria-pressed` |

Имя группы задайте в `label`. Tab попадает только на одну кнопку группы, а по остальным ходят
стрелки. При направлении текста справа налево стрелки влево и вправо меняются местами.

<KeyboardReference name="NuiToggleGroup" />

## API

<ApiReference name="NuiToggleGroup" />
