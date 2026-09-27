import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiUpload: {
    props: {
      ...fieldControl,
      upload: {
        ru: 'Адаптер загрузки: получает File, колбэк прогресса и AbortSignal, возвращает промис с результатом.',
        en: 'Upload adapter: receives the File, a progress callback and an AbortSignal, returns a promise with the result.',
      },
      accept: {
        ru: 'Допустимые файлы: расширения, точные типы или маски вроде image/*.',
        en: 'Accepted files: extensions, exact types or masks such as image/*.',
      },
      multiple: {
        ru: 'Несколько файлов; без него новый файл заменяет предыдущий.',
        en: 'Several files; without it a new file replaces the previous one.',
      },
      maxSize: { ru: 'Максимальный размер файла в байтах.', en: 'Maximum file size in bytes.' },
      maxFiles: {
        ru: 'Максимум файлов с учётом уже лежащих в модели.',
        en: 'Maximum number of files, counting those already in the model.',
      },
      validate: {
        ru: 'Своя проверка; возвращает текст ошибки или undefined.',
        en: 'Custom check; returns an error text or undefined.',
      },
      rejected: {
        ru: 'Отклонённые файлы: показать в списке с причиной или отбросить.',
        en: 'Rejected files: list them with the reason or drop them.',
      },
      auto: {
        ru: 'Запускать загрузку сразу; false держит файлы в очереди до start().',
        en: 'Start uploading at once; false keeps the files queued until start().',
      },
      concurrency: {
        ru: 'Сколько файлов грузится одновременно.',
        en: 'How many files upload at the same time.',
      },
      layout: {
        ru: 'Список строк или сетка миниатюр.',
        en: 'A list of rows or a grid of thumbnails.',
      },
      dropLabel: {
        ru: 'Текст зоны перетаскивания; по умолчанию из словаря.',
        en: 'Drop zone text; the dictionary supplies the default.',
      },
      browseLabel: {
        ru: 'Текст кнопки выбора файлов; по умолчанию из словаря.',
        en: 'Browse button text; the dictionary supplies the default.',
      },
      cancelLabel: {
        ru: 'Доступное имя кнопки отмены; по умолчанию из словаря.',
        en: 'Accessible name of the cancel button; the dictionary supplies the default.',
      },
      retryLabel: {
        ru: 'Доступное имя кнопки повтора; по умолчанию из словаря.',
        en: 'Accessible name of the retry button; the dictionary supplies the default.',
      },
      removeLabel: {
        ru: 'Доступное имя кнопки удаления; по умолчанию из словаря.',
        en: 'Accessible name of the remove button; the dictionary supplies the default.',
      },
      doneLabel: {
        ru: 'Текст готового файла; по умолчанию из словаря.',
        en: 'Text of a finished file; the dictionary supplies the default.',
      },
      errorLabel: {
        ru: 'Функция текста ошибки по её причине и элементу.',
        en: 'Function that builds the error text from the reason and the item.',
      },
    },
    models: {
      'v-model': {
        ru: 'Элементы со статусами queued, uploading, done и error.',
        en: 'Items with the statuses queued, uploading, done and error.',
      },
    },
    events: {
      done: {
        ru: 'Файл загружен; приходит элемент с результатом.',
        en: 'A file finished; receives the item with the result.',
      },
      error: {
        ru: 'Адаптер отклонил файл; приходит элемент с ошибкой.',
        en: 'The adapter failed; receives the item with the error.',
      },
      reject: {
        ru: 'Файл не прошёл проверку; приходит файл и причина.',
        en: 'A file failed validation; receives the file and the reason.',
      },
      remove: { ru: 'Элемент удалён из модели.', en: 'An item left the model.' },
    },
    slots: {
      default: {
        ru: 'Содержимое зоны; получает open() и флаг перетаскивания.',
        en: 'Zone content; receives open() and the dragging flag.',
      },
      item: {
        ru: 'Разметка строки файла; получает элемент, миниатюру и действия.',
        en: 'File row markup; receives the item, the preview and the actions.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'На кнопке выбора открывает системный диалог.',
          en: 'On the browse button opens the system dialog.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'На кнопке выбора открывает системный диалог.',
          en: 'On the browse button opens the system dialog.',
        },
      },
    ],
  },
};

export default docs;
