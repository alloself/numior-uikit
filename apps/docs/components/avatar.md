# Avatar

`NuiAvatar` показывает фото пользователя, а без фото — его инициалы или иконку. Рядом с
аватаром можно вывести статус: в сети, занят, нет на месте.

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

`NuiAvatarGroup` выводит участников из `items` с наложением друг на друга. Свойство `max`
ограничивает число аватаров, остальные сворачиваются в «+N». Размер и форму задайте один раз на
группе через `size` и `shape`.

<Example name="avatar/Group" />

### Бейдж в углу

Положите [Badge](/components/badge) в слот `badge`, чтобы показать в углу счётчик или точку.

<Example name="avatar/Badge" />

## Поведение

Фото берётся из `src`. Если его нет или оно не загрузилось, аватар показывает инициалы из `name`:
первые буквы первого и последнего слова. Без `name` выводится иконка.

Свойство `status` принимает `online`, `offline`, `busy` и `away` и рисует точку нужного цвета.
`size` принимает `sm`, `md`, `lg` и `xl`, `shape` — `circle` или `square`.

## Доступность

Экранный диктор называет аватар по `alt` или `name`; аватар без имени он пропускает. У точки
статуса своя подпись: «В сети», «Занят» и так далее, её можно заменить через `statusLabel`.
Группу подпишите через `label`.

## API

<ApiReference :names="['NuiAvatar', 'NuiAvatarGroup']" />
