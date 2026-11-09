import { plural, type NuiMessageCatalog } from '@numior/primitives';

export interface NuiCollabMessages {
  readonly present: string;
  readonly history: string;
  readonly saveVersion: string;
  readonly noVersions: string;
  readonly showChanges: string;
  readonly noChanges: string;
  readonly restore: string;
  readonly closeVersion: string;
  readonly historyFailed: string;
  readonly reportTitle: string;
  readonly reportVersion: (context: {
    readonly subject: string;
    readonly stored: number;
    readonly current: number;
  }) => string;
  readonly reportStep: (context: { readonly subject: string }) => string;
  readonly reportDamaged: string;
  readonly reportUnsent: (context: { readonly count: number }) => string;
  readonly alternatives: string;
  readonly alternativeRestore: string;
  readonly alternativeShow: string;
  readonly alternativeHide: string;
  readonly alternativeUnknown: string;
  readonly alternativeEmpty: string;
  readonly alternativeTrue: string;
  readonly alternativeFalse: string;
  readonly comments: string;
  readonly add: string;
  readonly placeholder: string;
  readonly replyPlaceholder: string;
  readonly send: string;
  readonly cancel: string;
  readonly reply: string;
  readonly resolve: string;
  readonly reopen: string;
  readonly remove: string;
  readonly show: string;
  readonly empty: string;
  readonly lost: string;
  readonly resolved: string;
  readonly failed: string;
}

export const collabMessages: NuiMessageCatalog<NuiCollabMessages> = {
  namespace: 'collaboration',
  en: {
    present: 'People in this document',
    history: 'Version history',
    saveVersion: 'Save version',
    noVersions: 'No saved versions yet',
    showChanges: 'Show changes',
    noChanges: 'Nothing changed in this version',
    restore: 'Restore this version',
    closeVersion: 'Close',
    historyFailed: 'The version history is unavailable',
    reportTitle: 'This document is read-only',
    reportVersion: ({ subject, stored, current }) =>
      `${subject}: the saved copy has version ${stored}, this application expects ${current}`,
    reportStep: ({ subject }) => `${subject}: saved changes cannot be converted to the new version`,
    reportDamaged: 'The copy saved on this device cannot be read',
    reportUnsent: ({ count }) =>
      `${count} unsent ${plural('en', count, { one: 'change is', other: 'changes are' })} kept on this device`,
    alternatives: 'Overwritten values',
    alternativeRestore: 'Put back',
    alternativeShow: 'Show in the document',
    alternativeHide: 'Hide',
    alternativeUnknown: 'Another participant',
    alternativeEmpty: 'Empty',
    alternativeTrue: 'Yes',
    alternativeFalse: 'No',
    comments: 'Comments',
    add: 'Add comment',
    placeholder: 'Write a comment',
    replyPlaceholder: 'Write a reply',
    send: 'Send',
    cancel: 'Cancel',
    reply: 'Reply',
    resolve: 'Resolve',
    reopen: 'Reopen',
    remove: 'Delete',
    show: 'Show in text',
    empty: 'No comments yet',
    lost: 'The text was removed',
    resolved: 'Resolved',
    failed: 'The comment could not be saved',
  },
  ru: {
    present: 'Сейчас в документе',
    history: 'История версий',
    saveVersion: 'Сохранить версию',
    noVersions: 'Сохранённых версий пока нет',
    showChanges: 'Показать изменения',
    noChanges: 'В этой версии нет изменений',
    restore: 'Восстановить эту версию',
    closeVersion: 'Закрыть',
    historyFailed: 'История версий недоступна',
    reportTitle: 'Документ открыт только для чтения',
    reportVersion: ({ subject, stored, current }) =>
      `${subject}: у сохранённой копии версия ${stored}, приложение ждёт ${current}`,
    reportStep: ({ subject }) => `${subject}: сохранённые правки нельзя перевести на новую версию`,
    reportDamaged: 'Копию на этом устройстве не удалось прочитать',
    reportUnsent: ({ count }) => `Неотправленные правки сохранены на этом устройстве: ${count}`,
    alternatives: 'Перезаписанные значения',
    alternativeRestore: 'Вернуть',
    alternativeShow: 'Показать в документе',
    alternativeHide: 'Скрыть',
    alternativeUnknown: 'Другой участник',
    alternativeEmpty: 'Пусто',
    alternativeTrue: 'Да',
    alternativeFalse: 'Нет',
    comments: 'Комментарии',
    add: 'Добавить комментарий',
    placeholder: 'Напишите комментарий',
    replyPlaceholder: 'Напишите ответ',
    send: 'Отправить',
    cancel: 'Отмена',
    reply: 'Ответить',
    resolve: 'Решить',
    reopen: 'Открыть снова',
    remove: 'Удалить',
    show: 'Показать в тексте',
    empty: 'Пока нет комментариев',
    lost: 'Текст удалён',
    resolved: 'Решён',
    failed: 'Не удалось сохранить комментарий',
  },
};
