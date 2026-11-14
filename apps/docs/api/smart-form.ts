import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSmartForm: {
    props: {
      form: { ru: 'Форма, которую вернул `useForm`.', en: 'Form returned by `useForm`.' },
      fields: {
        ru: 'Поля, секции и повторяемые группы, собранные через `formConfig`.',
        en: 'Fields, sections and repeatable groups built with `formConfig`.',
      },
      steps: {
        ru: 'Шаги пошаговой формы вместо `fields`. Над формой появляется степпер.',
        en: 'Wizard steps in place of `fields`. A stepper appears above the form.',
      },
      layout: {
        ru: 'Раскладка полей по сетке в синтаксисе `grid-template-areas`, например `"city zip"`.',
        en: 'Grid of the fields in `grid-template-areas` syntax, such as `"city zip"`.',
      },
      inline: {
        ru: 'Ставит поля и кнопку в одну строку: `fit` — поля по содержимому, `grow` — на всю ширину.',
        en: 'Puts the fields and the button in one row: `fit` sizes the fields to their content, `grow` stretches them to the full width.',
      },
      disabled: {
        ru: 'Отключает все поля и кнопки формы.',
        en: 'Disables every field and button of the form.',
      },
      readonly: {
        ru: 'Показывает значения всех полей без возможности их менять. Кнопка отправки отключена.',
        en: 'Shows every field value without letting the user change it. The submit button is disabled.',
      },
      reserveError: {
        ru: 'Оставляет место под ошибку у каждого поля, чтобы форма не сдвигалась.',
        en: 'Reserves space for an error under every field so the form does not shift.',
      },
      submitLabel: {
        ru: 'Текст кнопки отправки. По умолчанию — «Отправить» из словаря.',
        en: 'Submit button text. Defaults to "Submit" from the dictionary.',
      },
      nextLabel: {
        ru: 'Текст кнопки перехода к следующему шагу. По умолчанию — «Далее» из словаря.',
        en: 'Next step button text. Defaults to "Next" from the dictionary.',
      },
      backLabel: {
        ru: 'Текст кнопки возврата на предыдущий шаг. По умолчанию — «Назад» из словаря.',
        en: 'Back button text. Defaults to "Back" from the dictionary.',
      },
    },
    models: {
      'v-model:step': {
        ru: '`value` текущего шага пошаговой формы.',
        en: '`value` of the current wizard step.',
      },
    },
    slots: {
      'form-errors': {
        ru: 'Своя разметка ошибок всей формы, например от сервера. Получает `errors`.',
        en: 'Custom markup of form-level errors, such as server errors. Receives `errors`.',
      },
      actions: {
        ru: 'Свои кнопки формы. Получает `pending`, `dirty`, `submit`, `reset`, а в пошаговой форме — `step` и `back`.',
        en: 'Custom form buttons. Receives `pending`, `dirty`, `submit`, `reset`, plus `step` and `back` in a wizard.',
      },
    },
  },
};

export default docs;
