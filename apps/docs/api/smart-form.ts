import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSmartForm: {
    props: {
      form: { ru: 'Форма из useForm.', en: 'The form from useForm.' },
      fields: {
        ru: 'Конфигурация полей, секций и групп из formConfig.',
        en: 'Configuration of fields, sections and arrays from formConfig.',
      },
      steps: { ru: 'Шаги мастера вместо fields.', en: 'Wizard steps instead of fields.' },
      layout: {
        ru: 'Сетка в синтаксисе grid-template-areas.',
        en: 'Grid in the grid-template-areas syntax.',
      },
      inline: {
        ru: 'Поля в строку; grow растягивает их на всю ширину.',
        en: 'Fields in a row; grow stretches them to the full width.',
      },
      disabled: { ru: 'Выключает все поля и кнопки.', en: 'Disables every field and button.' },
      reserveError: {
        ru: 'Держит строку под ошибку у всех полей.',
        en: 'Keeps an error line under every field.',
      },
      submitLabel: {
        ru: 'Текст кнопки отправки; по умолчанию из словаря.',
        en: 'Submit button text; the dictionary supplies the default.',
      },
      nextLabel: {
        ru: 'Текст кнопки следующего шага; по умолчанию из словаря.',
        en: 'Next step button text; the dictionary supplies the default.',
      },
      backLabel: {
        ru: 'Текст кнопки предыдущего шага; по умолчанию из словаря.',
        en: 'Back button text; the dictionary supplies the default.',
      },
    },
    models: { 'v-model:step': { ru: 'Текущий шаг мастера.', en: 'Current wizard step.' } },
    slots: {
      'form-errors': { ru: 'Блок ошибок без поля.', en: 'Block of errors without a field.' },
      actions: {
        ru: 'Кнопки; получает pending, dirty, submit, reset и шаги.',
        en: 'Buttons; receives pending, dirty, submit, reset and the steps.',
      },
    },
  },
};

export default docs;
