# Badge

`NuiBadge` — неинтерактивная метка меньше чипа: статус, счётчик или точка состояния. `tone`
задаёт цвет, `variant` — вид, `size` — высоту. Значения, которые пользователь выбирает и
убирает, показывает [Chip](/components/chip).

<Example name="badge/Basic" />

## Установка

```ts
import { NuiBadge } from '@numior/vue';
import '@numior/vue/styles/badge.css';
```

## Использование

<Configurator name="NuiBadge" />

## Примеры

### Счётчик, точка и угол

`count` с `max` показывает число и «99+», `dot` рисует только точку, `floating` сажает бейдж в
угол родителя с `position: relative`.

<Example name="badge/Count" />

## Доступность

Бейдж — `<span>` без роли, его текст читается вместе с окружением. Точка и счётчик без текста
получают `role="img"` и имя из `label`; точка без `label` считается декоративной и скрыта от
вспомогательных технологий.

## API

<ApiReference name="NuiBadge" />
