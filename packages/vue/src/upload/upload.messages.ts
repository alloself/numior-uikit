import { plural, type NuiMessageCatalog } from '@numior/primitives';

export interface NuiUploadMessages {
  readonly drop: string;
  readonly browse: string;
  readonly cancel: string;
  readonly retry: string;
  readonly remove: string;
  readonly done: string;
  readonly typeError: string;
  readonly tooLarge: string;
  readonly largerThan: (params: { readonly size: string }) => string;
  readonly tooMany: string;
  readonly moreThan: (params: { readonly count: number }) => string;
  readonly rejected: string;
  readonly failed: string;
}

export const uploadMessages: NuiMessageCatalog<'upload'> = {
  namespace: 'upload',
  en: {
    drop: 'Drop files here',
    browse: 'Choose files',
    cancel: 'Cancel upload',
    retry: 'Retry',
    remove: 'Remove',
    done: 'Uploaded',
    typeError: 'Unsupported file type',
    tooLarge: 'File is too large',
    largerThan: ({ size }) => `Larger than ${size}`,
    tooMany: 'Too many files',
    moreThan: ({ count }) =>
      `More than ${count} ${plural('en', count, { one: 'file', other: 'files' })}`,
    rejected: 'File rejected',
    failed: 'Upload failed',
  },
  ru: {
    drop: 'Перетащите файлы сюда',
    browse: 'Выбрать файлы',
    cancel: 'Отменить загрузку',
    retry: 'Повторить',
    remove: 'Удалить',
    done: 'Загружено',
    typeError: 'Неподдерживаемый тип файла',
    tooLarge: 'Файл слишком большой',
    largerThan: ({ size }) => `Файл больше ${size}`,
    tooMany: 'Слишком много файлов',
    moreThan: ({ count }) =>
      `Не больше ${count} ${plural('ru', count, { one: 'файла', few: 'файлов', many: 'файлов', other: 'файла' })}`,
    rejected: 'Файл отклонён',
    failed: 'Не удалось загрузить',
  },
};
