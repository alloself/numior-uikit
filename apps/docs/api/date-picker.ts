import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const dictionary = (ru: string, en: string, ruDefault: string, enDefault: string) => ({
  ru: `${ru}. По умолчанию — «${ruDefault}» из словаря.`,
  en: `${en}. Defaults to "${enDefault}" from the dictionary.`,
});

const calendar = {
  locale: {
    ru: 'Язык, формат даты и первый день недели. По умолчанию — из `createNuiConfig`.',
    en: 'Language, date format and first day of the week. Defaults to `createNuiConfig`.',
  },
  weekStart: {
    ru: 'Первый день недели: от 1 (понедельник) до 7 (воскресенье). Без него берётся из локали.',
    en: 'First day of the week, from 1 (Monday) to 7 (Sunday). Defaults to the locale.',
  },
  min: {
    ru: 'Самая ранняя дата, которую можно выбрать.',
    en: 'Earliest date that can be selected.',
  },
  max: {
    ru: 'Самая поздняя дата, которую можно выбрать.',
    en: 'Latest date that can be selected.',
  },
  isDateDisabled: {
    ru: 'Функция, которая отключает отдельные даты, например выходные.',
    en: 'Function that disables individual dates, such as weekends.',
  },
  weekNumbers: {
    ru: 'Показывает в календаре колонку с номерами недель.',
    en: 'Shows a week number column in the calendar.',
  },
  months: {
    ru: 'Сколько месяцев календарь показывает рядом.',
    en: 'How many months the calendar shows side by side.',
  },
  today: {
    ru: 'Сегодняшняя дата в формате `YYYY-MM-DD`. Без неё берётся из часов браузера после монтирования.',
    en: 'Today as `YYYY-MM-DD`. Without it the browser clock gives the date after mounting.',
  },
  clearable: {
    ru: 'Показывает в поле кнопку, которая стирает дату.',
    en: 'Shows a button in the field that clears the date.',
  },
  openOnClick: {
    ru: 'Открывает календарь по клику на поле. Фокус остаётся в поле, и дату можно набрать с клавиатуры.',
    en: 'Opens the calendar on a click in the field. The focus stays there, so the date can still be typed.',
  },
  readonly: {
    ru: 'Показывает дату без возможности её изменить: ввод и календарь недоступны.',
    en: 'Shows the date without letting it change: typing and the calendar are blocked.',
  },
  placement: {
    ru: 'Где открывается календарь, например `bottom-start` или `top`.',
    en: 'Where the calendar opens, such as `bottom-start` or `top`.',
  },
  openLabel: dictionary(
    'Подпись кнопки календаря для экранных дикторов',
    'Calendar button label for screen readers',
    'Выбрать дату',
    'Choose date',
  ),
  clearLabel: dictionary(
    'Подпись кнопки очистки для экранных дикторов',
    'Clear button label for screen readers',
    'Очистить',
    'Clear',
  ),
  dialogLabel: dictionary(
    'Подпись окна с календарём для экранных дикторов',
    'Calendar popup label for screen readers',
    'Календарь',
    'Calendar',
  ),
  todayLabel: dictionary(
    'Текст кнопки «Сегодня»',
    'Text of the "Today" button',
    'Сегодня',
    'Today',
  ),
  previousLabel: dictionary(
    'Подпись кнопки предыдущего месяца для экранных дикторов',
    'Previous month button label for screen readers',
    'Предыдущий месяц',
    'Previous month',
  ),
  nextLabel: dictionary(
    'Подпись кнопки следующего месяца для экранных дикторов',
    'Next month button label for screen readers',
    'Следующий месяц',
    'Next month',
  ),
  monthLabel: dictionary(
    'Подпись кнопки выбора месяца для экранных дикторов',
    'Month picker button label for screen readers',
    'Выбрать месяц',
    'Choose month',
  ),
  yearLabel: dictionary(
    'Подпись кнопки выбора года для экранных дикторов',
    'Year picker button label for screen readers',
    'Выбрать год',
    'Choose year',
  ),
  weekLabel: dictionary(
    'Заголовок колонки номеров недель для экранных дикторов',
    'Week number column heading for screen readers',
    'Неделя',
    'Week',
  ),
};

const exposed = {
  focus: { ru: 'Переводит фокус в поле.', en: 'Moves the focus into the field.' },
  open: { ru: 'Открывает календарь.', en: 'Opens the calendar.' },
  close: { ru: 'Закрывает календарь.', en: 'Closes the calendar.' },
};

const actions = {
  actions: {
    ru: 'Кнопки под календарём рядом с «Сегодня».',
    en: 'Buttons under the calendar next to "Today".',
  },
};

const docs: DocsMap = {
  NuiDatePicker: {
    configurator: {
      scene: 'date-picker/Example',
      props: [
        'size',
        'placement',
        'clearable',
        'openOnClick',
        'disabled',
        'label',
        'description',
        'error',
      ],
      values: { label: { ru: 'Дата отгрузки', en: 'Ship date' } },
    },
    props: {
      ...fieldControl,
      ...calendar,
      placeholder: { ru: 'Текст в пустом поле.', en: 'Text shown in the empty field.' },
      name: {
        ru: 'Атрибут `name` скрытого поля, которое отправляет дату с формой в формате ISO.',
        en: 'The `name` of a hidden input that sends the date with the form in ISO format.',
      },
      time: {
        ru: 'Добавляет поле времени под календарём. Значение становится `YYYY-MM-DDTHH:mm`; дата без времени читается как полночь.',
        en: 'Adds a time field under the calendar. The value becomes `YYYY-MM-DDTHH:mm`; a date without a time reads as midnight.',
      },
      timeStep: {
        ru: 'Шаг минут при выборе времени, например 15.',
        en: 'Minute step when picking the time, such as 15.',
      },
      timeLabel: dictionary(
        'Подпись кнопки выбора времени для экранных дикторов',
        'Time button label for screen readers',
        'Выбрать время',
        'Choose time',
      ),
    },
    models: {
      'v-model': {
        ru: 'Дата в формате `YYYY-MM-DD`, с `time` — вместе со временем. `null`, если дата не выбрана.',
        en: 'Date as `YYYY-MM-DD`, with the time when `time` is on. `null` when no date is set.',
      },
    },
    slots: actions,
    exposed,
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Открывает календарь. Если он уже открыт, переводит фокус на выбранный день.',
          en: 'Opens the calendar. When it is open, moves the focus to the selected day.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает календарь.', en: 'Closes the calendar.' } },
      {
        keys: 'Enter',
        description: {
          ru: 'В поле времени закрывает календарь.',
          en: 'In the time field, closes the calendar.',
        },
      },
    ],
  },
  NuiDateRangePicker: {
    configurator: {
      scene: 'date-range-picker/Example',
      props: [
        'size',
        'placement',
        'months',
        'clearable',
        'openOnClick',
        'disabled',
        'label',
        'error',
      ],
      values: { label: { ru: 'Период продаж', en: 'Sales period' } },
    },
    props: {
      ...fieldControl,
      ...calendar,
      startPlaceholder: {
        ru: 'Текст в пустом поле даты начала.',
        en: 'Text shown in the empty start date field.',
      },
      endPlaceholder: {
        ru: 'Текст в пустом поле даты окончания.',
        en: 'Text shown in the empty end date field.',
      },
      startName: {
        ru: 'Атрибут `name` скрытого поля, которое отправляет дату начала с формой.',
        en: 'The `name` of a hidden input that sends the start date with the form.',
      },
      endName: {
        ru: 'Атрибут `name` скрытого поля, которое отправляет дату окончания с формой.',
        en: 'The `name` of a hidden input that sends the end date with the form.',
      },
      endLabel: dictionary(
        'Подпись поля даты окончания для экранных дикторов',
        'End date field label for screen readers',
        'Дата окончания',
        'End date',
      ),
      presets: {
        ru: 'Готовые периоды рядом с календарём, например «Последние 7 дней».',
        en: 'Ready-made periods next to the calendar, such as "Last 7 days".',
      },
    },
    models: {
      'v-model': {
        ru: 'Период `{ start, end }` с датами `YYYY-MM-DD` или `null`.',
        en: 'Period `{ start, end }` with `YYYY-MM-DD` dates, or `null`.',
      },
    },
    slots: actions,
    exposed,
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Открывает календарь. Если он уже открыт, переводит в него фокус.',
          en: 'Opens the calendar. When it is open, moves the focus into it.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает календарь.', en: 'Closes the calendar.' } },
    ],
  },
};

export default docs;
