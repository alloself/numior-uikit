# Avatar

Фото, инициалы или иконка человека.

<Example name="avatar/Basic" />

Передайте фото в `src` и имя в `name`: без фото аватар покажет инициалы.

## Установка

```ts
import { NuiAvatar, NuiAvatarGroup } from '@numior/kit';
```

## Использование

Поменяйте размер, форму и статус.

<Configurator name="NuiAvatar" />

## Примеры

### Показать команду

Передайте людей в `items` и ограничьте число в `max`.

<Example name="avatar/Group" />

### Показать статус

Задайте `status`.

<Example name="avatar/Status" />

### Добавить счётчик в угол

Положите [Badge](/components/badge) в слот `badge`.

<Example name="avatar/Badge" />

## Поведение

Если фото нет или оно не загрузилось, аватар показывает инициалы из первого и последнего слова
`name`, а без имени — иконку.

## Доступность

Экранный диктор называет аватар по `alt` или `name`, а аватар без имени пропускает. Точку статуса
он читает словами «В сети», «Занят» и другими, свою подпись передайте в `statusLabel`. Группу
подпишите через `label`.

## API

<ApiReference :names="['NuiAvatar', 'NuiAvatarGroup']" />
