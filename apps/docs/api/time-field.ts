import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl, focusExposed } from './shared/field.ts';

const docs: DocsMap = {
  NuiTimeField: {
    props: {
      ...fieldControl,
      seconds: {
        ru: 'Сегмент секунд; модель становится HH:mm:ss.',
        en: 'Seconds segment; the model becomes HH:mm:ss.',
      },
      hourCycle: {
        ru: '12- или 24-часовой цикл вместо цикла локали.',
        en: '12- or 24-hour cycle instead of the locale one.',
      },
      locale: {
        ru: 'Локаль сегментов; по умолчанию из конфигурации.',
        en: 'Locale of the segments; the configuration supplies the default.',
      },
      min: { ru: 'Раннее допустимое время HH:mm.', en: 'Earliest allowed time HH:mm.' },
      max: { ru: 'Позднее допустимое время HH:mm.', en: 'Latest allowed time HH:mm.' },
      step: {
        ru: 'Шаг минут в барабанах и для PageUp/PageDown.',
        en: 'Minute step in the wheels and for PageUp/PageDown.',
      },
      readonly: {
        ru: 'Запрещает ввод, но оставляет значение доступным.',
        en: 'Blocks typing while keeping the value reachable.',
      },
      name: {
        ru: 'Имя скрытого поля формы со значением.',
        en: 'Name of the hidden form field with the value.',
      },
      placement: {
        ru: 'Сторона, с которой открываются барабаны.',
        en: 'Side on which the wheels open.',
      },
      clockLabel: {
        ru: 'Доступное имя кнопки барабанов; по умолчанию из словаря.',
        en: 'Accessible name of the wheels button; the dictionary supplies the default.',
      },
      emptyLabel: {
        ru: 'Текст пустого сегмента; по умолчанию из словаря.',
        en: 'Text of an empty segment; the dictionary supplies the default.',
      },
    },
    models: {
      'v-model': {
        ru: 'Время HH:mm без часового пояса или null.',
        en: 'Time as HH:mm without a time zone, or null.',
      },
    },
    exposed: focusExposed,
    keyboard: [
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Увеличивает сегмент с переносом.',
          en: 'Increments the segment with wraparound.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Уменьшает сегмент с переносом.',
          en: 'Decrements the segment with wraparound.',
        },
      },
      { keys: 'ArrowRight', description: { ru: 'Следующий сегмент.', en: 'Next segment.' } },
      { keys: 'ArrowLeft', description: { ru: 'Предыдущий сегмент.', en: 'Previous segment.' } },
      {
        keys: 'PageUp',
        description: {
          ru: 'Сдвигает время на step минут вперёд.',
          en: 'Moves the time step minutes forward.',
        },
      },
      {
        keys: 'PageDown',
        description: {
          ru: 'Сдвигает время на step минут назад.',
          en: 'Moves the time step minutes back.',
        },
      },
      { keys: 'Backspace', description: { ru: 'Очищает сегмент.', en: 'Clears the segment.' } },
      {
        keys: 'Alt+ArrowDown',
        description: { ru: 'Открывает барабаны.', en: 'Opens the wheels.' },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'В барабанах подтверждает и закрывает.',
          en: 'In the wheels confirms and closes.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает барабаны.', en: 'Closes the wheels.' } },
    ],
  },
};

export default docs;
