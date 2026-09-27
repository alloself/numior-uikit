# Шаги

`NuiStepper` показывает шаги процесса — регистрации, оформления, мастера настройки — как
`<nav>` с упорядоченным списком. `v-model` хранит значение текущего шага. Пройденные шаги
отмечаются галочкой, шаг с ошибкой — крестиком, остальные — номером, а линия между шагами
заливается по мере продвижения. Шаги ничего не проверяют сами: переходом управляет
приложение или умная форма.

<script setup>
import { ref } from 'vue'
const signup = ref('profile')
const settings = ref('access')
const signupSteps = [
  { value: 'account', label: 'Аккаунт', description: 'Почта и пароль' },
  { value: 'profile', label: 'Профиль', description: 'Имя и фото' },
  { value: 'plan', label: 'Тариф' },
  { value: 'review', label: 'Проверка' },
]
const settingsSteps = [
  { value: 'general', label: 'Основное', description: 'Название и адрес', status: 'complete' },
  { value: 'access', label: 'Доступ', description: 'Роли участников', status: 'error' },
  { value: 'billing', label: 'Оплата', description: 'Карта и реквизиты' },
  { value: 'danger', label: 'Удаление', description: 'Недоступно для гостей', disabled: true },
]
const move = (delta) => {
  const index = signupSteps.findIndex((step) => step.value === signup.value)
  signup.value = signupSteps[Math.min(Math.max(index + delta, 0), signupSteps.length - 1)].value
}
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiStepper v-model="signup" :steps="signupSteps" label="Регистрация" />
  <div style="display: flex; justify-content: flex-end; gap: 0.5rem">
    <NuiButton variant="outline" tone="neutral" @click="move(-1)">Назад</NuiButton>
    <NuiButton @click="move(1)">Далее</NuiButton>
  </div>
  <NuiStepper v-model="settings" :steps="settingsSteps" orientation="vertical" :linear="false" label="Настройки проекта" />
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStep } from '@numior/vue';
import '@numior/vue/styles/stepper.css';

const step = ref('profile');

const steps: NuiStepperStep[] = [
  { value: 'account', label: 'Аккаунт', description: 'Почта и пароль' },
  { value: 'profile', label: 'Профиль', description: 'Имя и фото' },
  { value: 'plan', label: 'Тариф' },
  { value: 'review', label: 'Проверка' },
];
</script>

<template>
  <NuiStepper v-model="step" :steps="steps" label="Регистрация" />
</template>
```

## Поведение

Статус шага выводится из позиции: шаги до текущего — `complete`, после — `upcoming`; явный
`status` (`complete`, `error`, `upcoming`) побеждает, поэтому умная форма отмечает ошибкой
только шаги, которые пользователь уже пробовал пройти. В линейном режиме (`linear`, по
умолчанию) кнопками становятся пройденные шаги и текущий — на них можно вернуться, а будущие
шаги остаются текстом. `:linear="false"` делает кнопками все шаги, кроме `disabled`; отключённый
шаг — недоступная кнопка. Клик по текущему шагу ничего не меняет, но кнопка остаётся на месте,
и фокус не теряется, когда шаг, на который вернулись, становится текущим.

`orientation="vertical"` ставит шаги в колонку с непрерывной линией между индикаторами. Узкий
горизонтальный степпер (контейнер уже `32rem`) прячет подписи визуально, оставляет индикаторы
и линии и показывает под ними название текущего шага и «Шаг 2 из 4». Номера форматируются по
локали конфигурации, в RTL ряд и заливка линий зеркалятся.

## Доступность

Ориентир `<nav aria-label>` и список `<ol role="list">` задают структуру; текущий шаг помечен
`aria-current="step"`. Индикатор скрыт от screen reader'а, статус читается из визуально
скрытого текста в имени шага («Профиль, выполнено», «Доступ, есть ошибки»). Кнопки шагов
проходятся по Tab и срабатывают по Enter и Space, без роуминга фокуса; в компактном режиме
подписи остаются в дереве доступности.

## API

| Prop            | Тип                          | По умолчанию                                          | Описание                                             |
| --------------- | ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `v-model`       | `string`                     | —                                                     | Значение текущего шага                               |
| `steps`         | `NuiStepperStep[]`           | —                                                     | `{ value, label, description?, status?, disabled? }` |
| `orientation`   | `'horizontal' \| 'vertical'` | `'horizontal'`                                        | Направление                                          |
| `linear`        | `boolean`                    | `true`                                                | Кнопками становятся только пройденные шаги           |
| `label`         | `string`                     | [словарь](/guide/localization#stepper): «Шаги»        | `aria-label` навигации                               |
| `completeLabel` | `string`                     | [словарь](/guide/localization#stepper): «выполнено»   | Скрытый статус пройденного шага                      |
| `errorLabel`    | `string`                     | [словарь](/guide/localization#stepper): «есть ошибки» | Скрытый статус шага с ошибкой                        |

Блок `nui-stepper` (модификатор `--orientation-*`; элементы `__list`, `__item` с `--complete`,
`--upcoming`, `--error`, `--current`, `--clickable`, `--disabled`, `__step`, `__indicator`,
`__mark`, `__status`, `__connector`, `__summary`, `__summary-label`, `__summary-count`).
Переменные элемента: `--_ring`, `--_fill`, `--_ink`, `--_label`, `--_halo`, `--_connector-fill`.
