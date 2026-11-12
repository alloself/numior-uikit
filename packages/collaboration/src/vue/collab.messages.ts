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
  readonly failureTitle: string;
  readonly failureSchema: string;
  readonly failureInvalid: string;
  readonly failureProtocol: string;
  readonly failureDiverged: string;
  readonly failureDocument: string;
  readonly failureUnsent: (context: { readonly count: number }) => string;
  readonly failureReadOnly: string;
  readonly failureRejoin: string;
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
    failureTitle: 'Your changes are no longer sent',
    failureSchema:
      'This page runs an older version of the application than the document needs. Reload the page.',
    failureInvalid: 'The server did not accept one of your changes.',
    failureProtocol: 'The server sent a reply this page could not read.',
    failureDiverged: 'Your copy is ahead of the document kept on the server.',
    failureDocument: 'A change made by someone else did not fit your copy.',
    failureUnsent: ({ count }) =>
      `${count} ${plural('en', count, { one: 'change of yours was', other: 'changes of yours were' })} not sent. Copy what you need before you open the document again.`,
    failureReadOnly: 'The document is read-only until you open it again.',
    failureRejoin: 'Open again',
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
    failureTitle: 'Правки больше не отправляются',
    failureSchema:
      'Страница работает на версии приложения старее той, что нужна документу. Обновите страницу.',
    failureInvalid: 'Сервер не принял одну из ваших правок.',
    failureProtocol: 'Сервер прислал ответ, который страница не смогла прочитать.',
    failureDiverged: 'Ваша копия новее документа на сервере.',
    failureDocument: 'Правка другого участника не подошла к вашей копии.',
    failureUnsent: ({ count }) =>
      `Не отправлено правок: ${count}. Скопируйте нужное, прежде чем открыть документ заново.`,
    failureReadOnly: 'Документ открыт только для чтения, пока вы не откроете его заново.',
    failureRejoin: 'Открыть заново',
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
