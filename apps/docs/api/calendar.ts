import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string, ruDefault: string, enDefault: string) => ({
  ru: `${ru}. По умолчанию — «${ruDefault}» из словаря.`,
  en: `${en}. Defaults to "${enDefault}" from the dictionary.`,
});

const docs: DocsMap = {
  NuiCalendar: {
    configurator: {
      scene: 'calendar/Example',
      props: [
        'size',
        'months',
        'weekNumbers',
        'fixedWeeks',
        'showOutsideDays',
        'showToday',
        'disabled',
      ],
    },
    props: {
      id: {
        ru: 'Атрибут `id` календаря. Без него создаётся автоматически.',
        en: 'Calendar `id` attribute. Generated when omitted.',
      },
      mode: {
        ru: 'Что выбирается: одна дата (`single`), несколько дат (`multiple`) или период (`range`).',
        en: 'What gets selected: one date (`single`), several dates (`multiple`) or a period (`range`).',
      },
      locale: {
        ru: 'Язык названий месяцев и дней и первый день недели. По умолчанию — из `createNuiConfig`.',
        en: 'Language of month and day names and the first day of the week. Defaults to `createNuiConfig`.',
      },
      weekStart: {
        ru: 'Первый день недели: от 1 (понедельник) до 7 (воскресенье). Без него берётся из локали.',
        en: 'First day of the week, from 1 (Monday) to 7 (Sunday). Defaults to the locale.',
      },
      min: {
        ru: 'Самая ранняя дата, которую можно выбрать. Без неё — 1 января 100 года.',
        en: 'Earliest date that can be selected, January 1, 100 by default.',
      },
      max: {
        ru: 'Самая поздняя дата, которую можно выбрать. Без неё — 31 декабря 9999 года.',
        en: 'Latest date that can be selected, December 31, 9999 by default.',
      },
      isDateDisabled: {
        ru: 'Функция, которая отключает отдельные даты, например выходные.',
        en: 'Function that disables individual dates, such as weekends.',
      },
      months: {
        ru: 'Сколько месяцев показать рядом.',
        en: 'How many months to show side by side.',
      },
      weekNumbers: {
        ru: 'Показывает колонку с номерами недель.',
        en: 'Shows a column with week numbers.',
      },
      fixedWeeks: {
        ru: 'Всегда показывает шесть недель, чтобы высота календаря не менялась между месяцами.',
        en: 'Always shows six weeks so the calendar height stays the same between months.',
      },
      showOutsideDays: {
        ru: 'Показывает в сетке дни соседних месяцев.',
        en: 'Shows days of the neighboring months in the grid.',
      },
      showToday: {
        ru: 'Показывает кнопку «Сегодня» под сеткой.',
        en: 'Shows a "Today" button under the grid.',
      },
      today: {
        ru: 'Сегодняшняя дата в формате `YYYY-MM-DD`. Без неё берётся из часов браузера после монтирования.',
        en: 'Today as `YYYY-MM-DD`. Without it the browser clock gives the date after mounting.',
      },
      presets: {
        ru: 'Готовые периоды сбоку от сетки, например «Последние 7 дней». Работают в режиме `range`.',
        en: 'Ready-made periods beside the grid, such as "Last 7 days". Work in `range` mode.',
      },
      size: { ru: 'Размер ячеек: `sm`, `md` или `lg`.', en: 'Cell size: `sm`, `md` or `lg`.' },
      disabled: {
        ru: 'Отключает календарь целиком: дни, стрелки и готовые периоды не отвечают на клик и клавиатуру.',
        en: 'Disables the whole calendar: the days, the arrows and the presets ignore clicks and keys.',
      },
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
      todayLabel: dictionary(
        'Текст кнопки «Сегодня»',
        'Text of the "Today" button',
        'Сегодня',
        'Today',
      ),
      weekLabel: dictionary(
        'Заголовок колонки номеров недель для экранных дикторов',
        'Week number column heading for screen readers',
        'Неделя',
        'Week',
      ),
    },
    models: {
      'v-model': {
        ru: 'Выбранная дата, массив дат или период `{ start, end }` — в зависимости от `mode`.',
        en: 'Selected date, array of dates or `{ start, end }` period, depending on `mode`.',
      },
      'v-model:month': {
        ru: 'Показанный месяц в формате `YYYY-MM`.',
        en: 'Shown month as `YYYY-MM`.',
      },
    },
    slots: {
      actions: {
        ru: 'Кнопки под сеткой рядом с «Сегодня».',
        en: 'Buttons under the grid next to "Today".',
      },
    },
    exposed: {
      focus: {
        ru: 'Переводит фокус на переданную дату или на день, который был в фокусе последним.',
        en: 'Moves the focus to the given date or to the last focused day.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Следующий день. При письме справа налево — предыдущий.',
          en: 'Next day. Previous day in right-to-left layouts.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Предыдущий день. При письме справа налево — следующий.',
          en: 'Previous day. Next day in right-to-left layouts.',
        },
      },
      {
        keys: 'ArrowDown',
        description: { ru: 'Тот же день недели через неделю.', en: 'Same weekday a week later.' },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Тот же день недели неделей раньше.',
          en: 'Same weekday a week earlier.',
        },
      },
      { keys: 'Home', description: { ru: 'Первый день недели.', en: 'First day of the week.' } },
      { keys: 'End', description: { ru: 'Последний день недели.', en: 'Last day of the week.' } },
      {
        keys: 'PageDown',
        description: {
          ru: 'Тот же день в следующем месяце, с Shift — в следующем году.',
          en: 'Same day next month, or next year with Shift.',
        },
      },
      {
        keys: 'PageUp',
        description: {
          ru: 'Тот же день в прошлом месяце, с Shift — в прошлом году.',
          en: 'Same day last month, or last year with Shift.',
        },
      },
      {
        keys: 'Enter',
        description: { ru: 'Выбирает день в фокусе.', en: 'Selects the focused day.' },
      },
      {
        keys: 'Space',
        description: { ru: 'Выбирает день в фокусе.', en: 'Selects the focused day.' },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Закрывает выбор месяца или года и возвращает к дням.',
          en: 'Closes the month or year picker and returns to the days.',
        },
      },
    ],
  },
};

export default docs;
