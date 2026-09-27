# Avatar

`NuiAvatar` показывает картинку по `src`, без неё или после ошибки загрузки — инициалы из
`name`, а без имени — иконку. `status` рисует точку состояния с подписью, `NuiAvatarGroup`
накладывает аватары друг на друга и сворачивает лишние в «+N».

<Example name="avatar/Basic" />

## Установка

```ts
import { NuiAvatar, NuiAvatarGroup } from '@numior/vue';
import '@numior/vue/styles/avatar.css';
```

## Использование

<Configurator name="NuiAvatar" />

## Примеры

### Группа

`items` и `max` показывают первых участников и число скрытых; группа раздаёт детям общие
`size` и `shape`.

<Example name="avatar/Group" />

### Бейдж в углу

Слот `badge` кладёт в угол [Badge](/components/badge) со счётчиком или точкой.

<Example name="avatar/Badge" />

## Поведение

Цепочка запасных вариантов: картинка → инициалы → иконка. Инициалы собираются из первой
буквы первого и последнего слова `name`. На сервере при заданном `src` всегда рендерится
`<img>`, а ошибка загрузки заменяет её уже в браузере без расхождений гидрации.

## Доступность

Фигура аватара — `role="img"` с именем из `alt` или `name`; без имени она декоративна. Точка
статуса — отдельный `role="img"` с подписью из `statusLabel` или словаря. Группа —
`role="group"` с `label`.

## API

<ApiReference :names="['NuiAvatar', 'NuiAvatarGroup']" />
