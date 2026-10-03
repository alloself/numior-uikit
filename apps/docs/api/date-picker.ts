import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const dictionary = (ru: string, en: string) => ({
  ru: `${ru}; по умолчанию из словаря.`,
  en: `${en}; the dictionary supplies the default.`,
});

const calendar = {
  locale: {
    ru: 'Локаль формата и календаря; по умолчанию из конфигурации.',
    en: 'Locale of the format and the calendar; the configuration supplies the default.',
  },
  weekStart: {
    ru: 'Первый день недели вместо дня локали.',
    en: 'First day of the week instead of the locale one.',
  },
  min: { ru: 'Ранняя допустимая дата.', en: 'Earliest allowed date.' },
  max: { ru: 'Поздняя допустимая дата.', en: 'Latest allowed date.' },
  isDateDisabled: {
    ru: 'Функция, закрывающая отдельные даты.',
    en: 'Function that disables individual dates.',
  },
  weekNumbers: {
    ru: 'Колонка номеров недель в календаре.',
    en: 'Week number column in the calendar.',
  },
  months: {
    ru: 'Сколько месяцев показывать в календаре.',
    en: 'How many months the calendar shows.',
  },
  today: {
    ru: 'Сегодняшняя дата; без неё берётся из часов после монтирования.',
    en: 'Today; without it taken from the clock after mounting.',
  },
  clearable: { ru: 'Кнопка очистки в поле.', en: 'Clear button inside the field.' },
  openOnClick: {
    ru: 'Открывает календарь щелчком по полю; фокус остаётся в поле, и дату можно набрать.',
    en: 'Opens the calendar on a click in the field; the focus stays in the field for typing.',
  },
  readonly: {
    ru: 'Запрещает ввод и открытие календаря.',
    en: 'Blocks typing and opening the calendar.',
  },
  placement: {
    ru: 'Сторона, с которой открывается календарь.',
    en: 'Side on which the calendar opens.',
  },
  openLabel: dictionary('Имя кнопки календаря', 'Name of the calendar button'),
  clearLabel: dictionary('Имя кнопки очистки', 'Name of the clear button'),
  dialogLabel: dictionary('Имя диалога календаря', 'Name of the calendar dialog'),
  todayLabel: dictionary('Текст кнопки «Сегодня»', 'Text of the "Today" button'),
  previousLabel: dictionary('Имя кнопки «предыдущий месяц»', 'Name of the "previous month" button'),
  nextLabel: dictionary('Имя кнопки «следующий месяц»', 'Name of the "next month" button'),
  monthLabel: dictionary('Имя кнопки выбора месяца', 'Name of the month picker button'),
  yearLabel: dictionary('Имя кнопки выбора года', 'Name of the year picker button'),
  weekLabel: dictionary('Заголовок колонки недель', 'Heading of the week column'),
};

const exposed = {
  focus: { ru: 'Ставит фокус в поле.', en: 'Moves the focus into the field.' },
  open: { ru: 'Открывает календарь.', en: 'Opens the calendar.' },
  close: { ru: 'Закрывает календарь.', en: 'Closes the calendar.' },
};

const actions = { actions: { ru: 'Кнопки под календарём.', en: 'Buttons under the calendar.' } };

const docs: DocsMap = {
  NuiDatePicker: {
    props: {
      ...fieldControl,
      ...calendar,
      placeholder: { ru: 'Текст пустого поля.', en: 'Text of the empty field.' },
      name: {
        ru: 'Имя скрытого поля формы с ISO-значением.',
        en: 'Name of the hidden form field with the ISO value.',
      },
      time: {
        ru: 'Поле времени под календарём; модель становится YYYY-MM-DDTHH:mm.',
        en: 'Time field under the calendar; the model becomes YYYY-MM-DDTHH:mm.',
      },
      timeStep: { ru: 'Шаг минут в поле времени.', en: 'Minute step of the time field.' },
      timeLabel: dictionary('Подпись поля времени', 'Label of the time field'),
    },
    models: {
      'v-model': {
        ru: 'Дата YYYY-MM-DD (с time — и время) или null.',
        en: 'Date as YYYY-MM-DD (with time also the time) or null.',
      },
    },
    slots: actions,
    exposed,
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'В поле открывает календарь на выбранном дне, а в открытый календарь переводит фокус.',
          en: 'In the field opens the calendar on the selected day, or moves the focus into it.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает календарь.', en: 'Closes the calendar.' } },
      {
        keys: 'Enter',
        description: {
          ru: 'В поле времени закрывает календарь.',
          en: 'In the time field closes the calendar.',
        },
      },
    ],
  },
  NuiDateRangePicker: {
    props: {
      ...fieldControl,
      ...calendar,
      startPlaceholder: { ru: 'Текст пустого поля начала.', en: 'Text of the empty start field.' },
      endPlaceholder: { ru: 'Текст пустого поля конца.', en: 'Text of the empty end field.' },
      startName: {
        ru: 'Имя скрытого поля формы для начала.',
        en: 'Name of the hidden form field for the start.',
      },
      endName: {
        ru: 'Имя скрытого поля формы для конца.',
        en: 'Name of the hidden form field for the end.',
      },
      endLabel: dictionary('Доступное имя поля конца', 'Accessible name of the end field'),
      presets: {
        ru: 'Готовые диапазоны рядом с календарём.',
        en: 'Ready-made ranges next to the calendar.',
      },
    },
    models: {
      'v-model': {
        ru: 'Диапазон { start, end } со строками или null.',
        en: 'Range { start, end } with strings or null.',
      },
    },
    slots: actions,
    exposed,
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'В поле открывает календарь, а в открытый календарь переводит фокус.',
          en: 'In a field opens the calendar, or moves the focus into it.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает календарь.', en: 'Closes the calendar.' } },
    ],
  },
};

export default docs;
