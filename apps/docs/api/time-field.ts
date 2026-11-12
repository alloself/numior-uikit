import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiTimeField: {
    configurator: {
      scene: 'time-field/Example',
      props: ['size', 'seconds', 'hourCycle', 'step', 'disabled', 'label', 'description', 'error'],
      values: { label: { ru: 'Время доставки', en: 'Delivery time' } },
    },
    props: {
      ...fieldControl,
      seconds: {
        ru: 'Добавляет секунды. Значение приходит в формате `HH:mm:ss`.',
        en: 'Adds seconds. The value comes as `HH:mm:ss`.',
      },
      hourCycle: {
        ru: '12- или 24-часовой формат вместо формата языка.',
        en: '12- or 24-hour clock in place of the locale default.',
      },
      locale: {
        ru: 'Язык подписей и формата времени, например `ru-RU`. По умолчанию — язык из `createNuiConfig`.',
        en: 'Locale of the labels and time format, such as `en-US`. Defaults to the locale from `createNuiConfig`.',
      },
      min: {
        ru: 'Самое раннее допустимое время в формате `HH:mm`.',
        en: 'Earliest allowed time as `HH:mm`.',
      },
      max: {
        ru: 'Самое позднее допустимое время в формате `HH:mm`.',
        en: 'Latest allowed time as `HH:mm`.',
      },
      step: {
        ru: 'Шаг минут в списке выбора и для клавиш PageUp и PageDown, например `15`.',
        en: 'Minute step in the picker and for PageUp and PageDown, such as `15`.',
      },
      readonly: {
        ru: 'Запрещает менять время. Значение можно выделить и скопировать.',
        en: 'Prevents changes to the time. The value stays selectable and copyable.',
      },
      name: {
        ru: 'Имя, с которым время уходит в форму.',
        en: 'Name the time is submitted with in a form.',
      },
      placement: {
        ru: 'С какой стороны поля открывается список выбора времени.',
        en: 'Side of the field the time picker opens on.',
      },
      clockLabel: {
        ru: 'Подпись кнопки с часами для экранных дикторов. По умолчанию — «Выбрать время» из словаря.',
        en: 'Clock button label for screen readers. Defaults to "Choose time" from the dictionary.',
      },
      emptyLabel: {
        ru: 'Текст, когда `min` и `max` не оставляют времени для выбора. По умолчанию — «Нет доступного времени».',
        en: 'Text shown when `min` and `max` leave no time to pick. Defaults to "No times".',
      },
    },
    models: {
      'v-model': {
        ru: 'Время в формате `HH:mm` без часового пояса или `null`.',
        en: 'Time as `HH:mm` without a time zone, or `null`.',
      },
    },
    exposed: focusExposed,
    keyboard: [
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Увеличивает часы или минуты. После максимума начинает с нуля.',
          en: 'Increases the hours or minutes, wrapping past the maximum.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Уменьшает часы или минуты. После нуля переходит к максимуму.',
          en: 'Decreases the hours or minutes, wrapping past zero.',
        },
      },
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Переходит от часов к минутам и дальше.',
          en: 'Moves from hours to minutes and on.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Переходит обратно от минут к часам.',
          en: 'Moves back from minutes to hours.',
        },
      },
      {
        keys: 'PageUp',
        description: {
          ru: 'Сдвигает время вперёд на `step` минут.',
          en: 'Moves the time forward by `step` minutes.',
        },
      },
      {
        keys: 'PageDown',
        description: {
          ru: 'Сдвигает время назад на `step` минут.',
          en: 'Moves the time back by `step` minutes.',
        },
      },
      {
        keys: 'Backspace',
        description: {
          ru: 'Стирает часы или минуты в фокусе.',
          en: 'Clears the focused hours or minutes.',
        },
      },
      {
        keys: 'Alt+ArrowDown',
        description: { ru: 'Открывает список выбора времени.', en: 'Opens the time picker.' },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'В списке выбора подтверждает время и закрывает список.',
          en: 'In the picker, confirms the time and closes.',
        },
      },
      {
        keys: 'Escape',
        description: { ru: 'Закрывает список выбора времени.', en: 'Closes the time picker.' },
      },
    ],
  },
};

export default docs;
