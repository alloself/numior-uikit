import type { NuiMessageCatalog } from '@numior/primitives';

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
