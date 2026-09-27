# Avatar

`NuiAvatar` показывает картинку по `src`, а без неё или после ошибки загрузки — инициалы из
`name`, а без имени — иконку `user`. `size` (`sm`…`xl`) и `shape` (`circle`, `square`) задают
геометрию, `status` рисует точку состояния с подписью, слот `badge` кладёт в угол
[бейдж](/components/badge). `NuiAvatarGroup` накладывает аватары друг на друга, сворачивает
лишние в «+N» и раздаёт детям общие `size` и `shape`. Аватары в группе и точка статуса
обведены кольцом цвета `--nui-ring`: это третий цвет, отличный и от поверхности, и от
приглушённой карточки, поэтому перекрытие читается на любом фоне.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiAvatar src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3Ccircle cx='32' cy='24' r='11' fill='%23fff'/%3E%3Cellipse cx='32' cy='54' rx='20' ry='14' fill='%23fff'/%3E%3C/svg%3E" name="Анна Смирнова" status="online" />
  <NuiAvatar src="/missing.png" name="Анна Смирнова" />
  <NuiAvatar shape="square" />
  <NuiAvatar name="Борис Ким" status="busy" size="lg">
    <template #badge><NuiBadge tone="error" :count="5" size="sm" /></template>
  </NuiAvatar>
  <NuiAvatar name="Вера Ли" status="away" status-label="Отошла" size="xl" shape="square" />
  <NuiAvatarGroup :items="[{ name: 'Анна Смирнова' }, { name: 'Борис Ким' }, { name: 'Вера Ли' }, { name: 'Глеб Орлов' }, { name: 'Дина Ахметова' }]" :max="3" size="lg" label="Команда" />
</div>

```vue
<script setup lang="ts">
import { NuiAvatar, NuiAvatarGroup } from '@numior/vue';
import '@numior/vue/styles/avatar.css';
</script>

<template>
  <NuiAvatar :src="user.photo" :name="user.name" status="online" />
  <NuiAvatarGroup :max="3" size="lg" label="Команда">
    <NuiAvatar v-for="member in team" :key="member.id" :name="member.name" />
  </NuiAvatarGroup>
</template>
```

## Поведение

Цепочка фолбэка: картинка → инициалы → иконка. Инициалы собираются из первой буквы первого
и последнего слова `name` (1–2 символа, верхний регистр). На сервере при заданном `src`
всегда рендерится `<img>`: ошибка загрузки существует только в браузере, и после неё Vue
заменяет картинку на фолбэк без расхождений гидратации. Новый `src` снова пробует картинку.

В группе `items` побеждает слот; без `max` показываются все. Переполнение — обычный
`NuiAvatar` с текстом `+N` (`overflowLabel` меняет формат). Свои `size`/`shape` у ребёнка
побеждают групповые.

## Доступность

Фигура аватара — `role="img"` с именем из `alt ?? name`; без имени она декоративна
(`aria-hidden="true"`). Точка статуса — отдельный `role="img"` с подписью из `statusLabel`
или из [словаря](/guide/localization#avatar) на языке конфигурации («В сети», «Не в сети», «Занят»,
«Нет на месте»).
Группа — `role="group"` с `label`.

## API

| Prop          | Тип                                         | По умолчанию                          | Описание                     |
| ------------- | ------------------------------------------- | ------------------------------------- | ---------------------------- |
| `src`         | `string`                                    | —                                     | Картинка                     |
| `alt`         | `string`                                    | `name`                                | Подпись картинки и фигуры    |
| `name`        | `string`                                    | —                                     | Источник инициалов и подписи |
| `size`        | `'sm' \| 'md' \| 'lg' \| 'xl'`              | `'md'`                                | 1.5 / 2 / 2.5 / 3.5rem       |
| `shape`       | `'circle' \| 'square'`                      | `'circle'`                            | Форма                        |
| `status`      | `'online' \| 'offline' \| 'busy' \| 'away'` | —                                     | Точка состояния              |
| `statusLabel` | `string`                                    | [словарь](/guide/localization#avatar) | Подпись точки                |
| `icon`        | `IconAlias`                                 | `'user'`                              | Иконка последнего фолбэка    |

`NuiAvatarGroup`: `items?: NuiAvatarItem[]`, `max`, `size`, `shape`, `label`,
`overflowLabel?: (count) => string`. Блоки `nui-avatar` (модификаторы `--size-*`, `--shape-*`,
`--status-*`, `--grouped`; элементы `__figure`, `__image`, `__initials`, `__icon`, `__status`,
`__badge`; переменные `--_size`, `--_radius`, `--_font-size`, `--_status-tone`) и
`nui-avatar-group` (`--size-*`, элемент `__overflow`, переменная `--_overlap`).
