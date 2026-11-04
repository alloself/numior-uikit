import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiDrawer: {
    props: {
      side: {
        ru: 'Край экрана: `start`, `end`, `top` или `bottom`. При письме справа налево `start` и `end` меняются местами.',
        en: 'Screen edge: `start`, `end`, `top` or `bottom`. `start` and `end` swap in right-to-left layouts.',
      },
      id: {
        ru: 'Атрибут `id` панели. Без него создаётся автоматически.',
        en: 'The `id` attribute of the drawer. Generated when omitted.',
      },
      title: {
        ru: 'Заголовок. Экранные дикторы зачитывают его при открытии.',
        en: 'Title. Screen readers announce it on open.',
      },
      description: { ru: 'Описание под заголовком.', en: 'Description under the title.' },
      size: {
        ru: 'Ширина панели сбоку или наибольшая высота панели сверху и снизу: от `sm` до `xl`. `xl` подходит для редактора рядом со страницей.',
        en: 'Width of a side drawer or maximum height of a top or bottom one, from `sm` to `xl`. `xl` suits an editor beside the page.',
      },
      closable: {
        ru: 'Показывает кнопку закрытия и разрешает закрыть панель клавишей Esc и кликом по фону.',
        en: 'Shows a close button and lets Esc and a backdrop click close the drawer.',
      },
      closeOnBackdrop: {
        ru: 'Закрывает окно по клику на затемнённый фон.',
        en: 'Closes on a click on the dimmed backdrop.',
      },
      closeLabel: {
        ru: 'Подпись кнопки закрытия для экранных дикторов. По умолчанию — «Закрыть» из словаря.',
        en: 'Close button label for screen readers. Defaults to "Close" from the dictionary.',
      },
    },
    models: { 'v-model:open': { ru: 'Открыта ли панель.', en: 'Whether the drawer is open.' } },
    events: {
      close: {
        ru: 'Срабатывает при закрытии. Передаёт `returnValue` формы с `method="dialog"`.',
        en: 'Fires on close with the `returnValue` of a `method="dialog"` form.',
      },
    },
  },
};

export default docs;
