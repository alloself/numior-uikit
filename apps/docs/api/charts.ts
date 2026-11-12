import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiChart: {
    props: {
      spec: {
        ru: 'Модель графика: вид, категории и серии значений.',
        en: 'Chart model: the kind, the categories, and the series of values.',
      },
      label: {
        ru: 'Имя фигуры для экранного диктора и подпись таблицы данных.',
        en: 'Accessible name of the figure and the caption of the data table.',
      },
      height: {
        ru: 'Высота сцены в пикселях или `fill`, чтобы занять высоту контейнера.',
        en: 'Scene height in pixels, or `fill` to take the height of the container.',
      },
      focusable: {
        ru: 'Делает фигуру остановкой Tab, с которой стрелки ходят по значениям.',
        en: 'Makes the figure a Tab stop where the arrow keys walk the values.',
      },
      locale: {
        ru: 'Локаль чисел, дат и встроенных текстов, если она отличается от локали конфигурации.',
        en: 'Locale for numbers, dates, and built-in texts when it differs from the configuration.',
      },
      timeZone: {
        ru: 'Часовой пояс IANA для делений и подписей оси времени, например `Europe/Moscow`. По умолчанию `UTC`.',
        en: 'IANA time zone for the ticks and labels of a time axis, such as `America/New_York`. Defaults to `UTC`.',
      },
      showTable: {
        ru: 'Показывает таблицу данных под графиком. Скрытую таблицу экранный диктор читает и так.',
        en: 'Shows the data table under the chart. A hidden table stays available to screen readers.',
      },
      legend: {
        ru: 'Выводит легенду, когда серий две и больше, а у круга и кольца — категорий.',
        en: 'Shows the legend for two or more series, or for the categories of a pie or doughnut.',
      },
    },
    models: {
      'v-model:selected': {
        ru: 'Выбранная цель: индекс категории, у секторов и точек ещё и серия. `null` — ничего не выбрано.',
        en: 'Selected target: the category index, plus the series for slices and points. `null` when nothing is selected.',
      },
    },
    slots: {
      tooltip: {
        ru: 'Содержимое подсказки. Получает цель `hit` и готовый `content` с заголовком и строками серий.',
        en: 'Tooltip content. Receives the `hit` target and the ready `content` with a title and series rows.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowRight / ArrowDown',
        description: {
          ru: 'Переходит к следующему значению; в RTL стрелка вправо ведёт к предыдущему.',
          en: 'Moves to the next value; in RTL the right arrow goes to the previous one.',
        },
      },
      {
        keys: 'ArrowLeft / ArrowUp',
        description: {
          ru: 'Переходит к предыдущему значению; в RTL стрелка влево ведёт к следующему.',
          en: 'Moves to the previous value; in RTL the left arrow goes to the next one.',
        },
      },
      {
        keys: 'PageDown / PageUp',
        description: {
          ru: 'Перескакивает на пять значений вперёд или назад.',
          en: 'Jumps five values forward or back.',
        },
      },
      {
        keys: 'Home / End',
        description: {
          ru: 'Переходит к первому или последнему значению.',
          en: 'Moves to the first or the last value.',
        },
      },
      {
        keys: 'Enter / Space',
        description: {
          ru: 'Выбирает значение или снимает выбор с выбранного.',
          en: 'Selects the value, or clears the selection when it is already selected.',
        },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Убирает подсветку значения, до которого дошли с клавиатуры.',
          en: 'Clears the highlight of the value reached from the keyboard.',
        },
      },
    ],
  },
};

export default docs;
