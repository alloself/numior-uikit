import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiUpload: {
    configurator: {
      scene: 'upload/Example',
      props: ['variant', 'layout', 'size', 'multiple', 'disabled', 'label', 'description', 'error'],
      values: {
        label: { ru: 'Фото товара', en: 'Product photos' },
        description: {
          ru: 'Первое фото попадёт на карточку товара',
          en: 'The first photo goes on the product card',
        },
      },
    },
    props: {
      ...fieldControl,
      upload: {
        ru: 'Функция, которая отправляет файл на сервер. Получает `File`, `onProgress` и `signal`, возвращает промис с ответом.',
        en: 'Function that sends the file to the server. Receives the `File`, `onProgress` and `signal`, returns a promise with the response.',
      },
      accept: {
        ru: 'Какие файлы принимать: расширения, типы или маски, например `.pdf,image/*`.',
        en: 'Files to accept: extensions, types or masks, such as `.pdf,image/*`.',
      },
      multiple: {
        ru: 'Разрешает выбрать несколько файлов. Без него новый файл заменяет прежний.',
        en: 'Lets the user add several files. Without it, a new file replaces the previous one.',
      },
      maxSize: {
        ru: 'Наибольший размер файла в байтах, например `5_000_000`.',
        en: 'Largest file size in bytes, such as `5_000_000`.',
      },
      maxFiles: {
        ru: 'Сколько всего файлов можно добавить, считая уже добавленные.',
        en: 'Total number of files allowed, counting those already added.',
      },
      validate: {
        ru: 'Своя проверка файла. Возвращает текст ошибки или `undefined`, если файл подходит.',
        en: 'Custom file check. Returns an error text, or `undefined` when the file is fine.',
      },
      rejected: {
        ru: 'Что делать с неподходящими файлами: `list` — показать в списке с причиной, `drop` — отбросить.',
        en: 'What to do with rejected files: `list` shows them with the reason, `drop` discards them.',
      },
      auto: {
        ru: 'Начинает загрузку сразу после выбора. Выключите, чтобы файлы ждали вызова `start`.',
        en: 'Starts uploading right after the files are chosen. Turn it off to queue them until `start` is called.',
      },
      concurrency: {
        ru: 'Сколько файлов загружается одновременно.',
        en: 'Number of files that upload at the same time.',
      },
      layout: {
        ru: 'Показывает файлы списком строк или сеткой миниатюр.',
        en: 'Shows the files as a list of rows or a grid of thumbnails.',
      },
      variant: {
        ru: '`zone` — область, куда можно перетащить файлы, `button` — только кнопка выбора.',
        en: '`zone` for an area that accepts dragged files, `button` for a browse button only.',
      },
      dropLabel: {
        ru: 'Текст области перетаскивания. По умолчанию — «Перетащите файлы сюда» из словаря.',
        en: 'Drop zone text. Defaults to "Drop files here" from the dictionary.',
      },
      browseLabel: {
        ru: 'Текст кнопки выбора. По умолчанию — «Выбрать файлы» из словаря.',
        en: 'Browse button text. Defaults to "Choose files" from the dictionary.',
      },
      cancelLabel: {
        ru: 'Подпись кнопки отмены для экранных дикторов. По умолчанию — «Отменить загрузку».',
        en: 'Cancel button label for screen readers. Defaults to "Cancel upload".',
      },
      retryLabel: {
        ru: 'Подпись кнопки повтора для экранных дикторов. По умолчанию — «Повторить» из словаря.',
        en: 'Retry button label for screen readers. Defaults to "Retry" from the dictionary.',
      },
      removeLabel: {
        ru: 'Подпись кнопки удаления для экранных дикторов. По умолчанию — «Удалить» из словаря.',
        en: 'Remove button label for screen readers. Defaults to "Remove" from the dictionary.',
      },
      doneLabel: {
        ru: 'Статус загруженного файла. По умолчанию — «Загружено» из словаря.',
        en: 'Status of an uploaded file. Defaults to "Uploaded" from the dictionary.',
      },
      errorLabel: {
        ru: 'Функция, которая строит текст ошибки из её причины и файла.',
        en: 'Function that builds the error text from the reason and the file.',
      },
    },
    models: {
      'v-model': {
        ru: 'Список файлов, у каждого статус: `queued`, `uploading`, `done` или `error`.',
        en: 'List of files, each with a status: `queued`, `uploading`, `done` or `error`.',
      },
    },
    events: {
      done: {
        ru: 'Срабатывает, когда файл загружен. Передаёт файл с ответом сервера.',
        en: 'Fires when a file is uploaded, with the file and the server response.',
      },
      error: {
        ru: 'Срабатывает, когда загрузка не удалась. Передаёт файл с ошибкой.',
        en: 'Fires when an upload fails, with the file and the error.',
      },
      reject: {
        ru: 'Срабатывает, когда файл не прошёл проверку. Передаёт файл и причину.',
        en: 'Fires when a file fails a check, with the file and the reason.',
      },
      remove: {
        ru: 'Срабатывает, когда файл убирают из списка.',
        en: 'Fires when a file is removed from the list.',
      },
    },
    slots: {
      default: {
        ru: 'Своё содержимое области. Получает `open` и `dragging`.',
        en: 'Custom zone content. Receives `open` and `dragging`.',
      },
      item: {
        ru: 'Своя разметка строки файла. Получает `item`, `preview` и действия `cancel`, `retry`, `remove`.',
        en: 'Custom file row markup. Receives `item`, `preview` and the `cancel`, `retry` and `remove` actions.',
      },
      button: {
        ru: 'Содержимое кнопки, когда `variant` равно `button`.',
        en: 'Button content when `variant` is `button`.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'На кнопке выбора открывает окно выбора файлов.',
          en: 'On the browse button, opens the file picker.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'На кнопке выбора открывает окно выбора файлов.',
          en: 'On the browse button, opens the file picker.',
        },
      },
    ],
  },
  NuiAvatarUpload: {
    props: {
      ...fieldControl,
      upload: {
        ru: 'Функция, которая отправляет файл на сервер. Получает `File`, `onProgress` и `signal`, возвращает промис с ответом.',
        en: 'Function that sends the file to the server. Receives the `File`, `onProgress` and `signal`, returns a promise with the response.',
      },
      accept: {
        ru: 'Какие изображения принимать. По умолчанию `image/*`.',
        en: 'Image types to accept. Defaults to `image/*`.',
      },
      maxSize: {
        ru: 'Наибольший размер файла в байтах, например `5_000_000`.',
        en: 'Largest file size in bytes, such as `5_000_000`.',
      },
      validate: {
        ru: 'Своя проверка файла. Возвращает текст ошибки или `undefined`, если файл подходит.',
        en: 'Custom file check. Returns an error text, or `undefined` when the file is fine.',
      },
      name: {
        ru: 'Имя человека. Пока изображения нет, на аватаре видны его инициалы.',
        en: 'Name of the person. Its initials show until an image is set.',
      },
      shape: {
        ru: 'Форма аватара: `circle` или `square`.',
        en: 'Shape of the avatar: `circle` or `square`.',
      },
      size: {
        ru: 'Размер аватара: `sm`, `md`, `lg` или `xl`.',
        en: 'Size of the avatar: `sm`, `md`, `lg` or `xl`.',
      },
      chooseLabel: {
        ru: 'Подпись кнопки, пока изображения нет. По умолчанию — «Выбрать изображение».',
        en: 'Button label while there is no image. Defaults to "Choose an image".',
      },
      changeLabel: {
        ru: 'Подпись кнопки, когда изображение есть. По умолчанию — «Сменить изображение».',
        en: 'Button label when an image is set. Defaults to "Change the image".',
      },
      retryLabel: {
        ru: 'Подпись кнопки повтора для экранных дикторов. По умолчанию — «Повторить» из словаря.',
        en: 'Retry button label for screen readers. Defaults to "Retry" from the dictionary.',
      },
      removeLabel: {
        ru: 'Подпись кнопки удаления для экранных дикторов. По умолчанию — «Удалить изображение».',
        en: 'Remove button label for screen readers. Defaults to "Remove the image".',
      },
      errorLabel: {
        ru: 'Функция, которая строит текст ошибки из её причины и файла.',
        en: 'Function that builds the error text from the reason and the file.',
      },
    },
    models: {
      'v-model': {
        ru: 'Изображение со статусом загрузки или `null`.',
        en: 'The image with its upload status, or `null`.',
      },
    },
    events: {
      done: {
        ru: 'Срабатывает, когда изображение загружено.',
        en: 'Fires when the image is uploaded.',
      },
      error: {
        ru: 'Срабатывает, когда загрузка изображения не удалась.',
        en: 'Fires when the image upload fails.',
      },
      reject: {
        ru: 'Срабатывает, когда файл не прошёл проверку. Передаёт причину.',
        en: 'Fires when the file fails a check, with the reason.',
      },
      remove: {
        ru: 'Срабатывает, когда изображение удаляют.',
        en: 'Fires when the image is removed.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'На аватаре открывает окно выбора файла.',
          en: 'On the avatar, opens the file picker.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'На аватаре открывает окно выбора файла.',
          en: 'On the avatar, opens the file picker.',
        },
      },
    ],
  },
};

export default docs;
