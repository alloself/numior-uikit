import type { DocsMap } from '../.vitepress/reference/reference.types';

const labels = {
  ru: 'Свои тексты вместо встроенных из `collabMessages`, по одному ключу.',
  en: 'Your own texts in place of the built-in ones from `collabMessages`, one key at a time.',
};

const comments = {
  ru: 'Комментарии документа из `useEditorComments`.',
  en: 'The document comments from `useEditorComments`.',
};

const docs: DocsMap = {
  NuiCollabCarets: {
    props: {
      peers: {
        ru: 'Соавторы из `useCollabEditor`: у каждого, кто работает в тексте, курсор с флажком имени.',
        en: 'Co-authors from `useCollabEditor`: everyone working in the text gets a caret with a name flag.',
      },
      editor: {
        ru: 'API редактора, поверх которого рисуются курсоры. Без него курсоры не видны.',
        en: 'Editor API the carets are drawn over. Without it the carets stay hidden.',
      },
    },
  },
  NuiCollabPresence: {
    props: {
      peers: {
        ru: 'Соавторы из `useCollabEditor`. Две вкладки одного человека дают один аватар.',
        en: 'Co-authors from `useCollabEditor`. Two tabs of one person show one avatar.',
      },
      max: {
        ru: 'Сколько аватаров показать до счётчика «+N». По умолчанию 5.',
        en: 'How many avatars to show before the “+N” counter. Defaults to 5.',
      },
      label: {
        ru: 'Имя группы аватаров для экранного диктора. По умолчанию «Сейчас в документе».',
        en: 'Accessible name of the avatar group. Defaults to “People in this document”.',
      },
    },
  },
  NuiCollabFailure: {
    props: {
      failure: {
        ru: 'Сбой из `useCollabEditor`: причина и сколько правок не дошло до сервера.',
        en: 'Failure from `useCollabEditor`: the reason and how many edits never reached the server.',
      },
      labels,
    },
    events: {
      rejoin: {
        ru: 'Нажата кнопка повторного входа. Кнопки нет, если схема документа не совпала с сервером.',
        en: 'The rejoin button was pressed. There is no button when the document schema differs from the server.',
      },
    },
    slots: {
      actions: {
        ru: 'Свои кнопки перед кнопкой повторного входа, например «Скачать копию».',
        en: 'Your own buttons before the rejoin button, such as “Download a copy”.',
      },
    },
  },
  NuiCollabReport: {
    props: {
      report: {
        ru: 'Отчёт из `useCollabEditor`: почему сохранённую копию нельзя открыть для правки.',
        en: 'Report from `useCollabEditor`: why the saved copy cannot be opened for editing.',
      },
      labels,
    },
  },
  NuiEditorCommentPopover: {
    props: {
      comments,
      editor: {
        ru: 'API редактора: поповер встаёт у выделения или у отмеченного текста.',
        en: 'Editor API: the popover sits at the selection or at the marked text.',
      },
      labels,
    },
  },
  NuiEditorComments: {
    props: {
      comments,
      labels,
    },
  },
  NuiEditorHistory: {
    props: {
      history: {
        ru: 'Версии документа из `useEditorHistory`.',
        en: 'Document versions from `useEditorHistory`.',
      },
      alternatives: {
        ru: 'Потерянные значения из `useCollabEditor`: панель покажет их под списком версий.',
        en: 'Lost values from `useCollabEditor`: the panel shows them under the version list.',
      },
      labels,
    },
  },
};

export default docs;
