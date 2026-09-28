import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiButton: {
    props: {
      variant: {
        ru: 'Форма кнопки: заливка, мягкая, контур, призрачная или ссылка.',
        en: 'Shape of the button: solid, soft, outline, ghost or link.',
      },
      tone: {
        ru: 'Семантическая роль; цвета берутся из токенов роли.',
        en: 'Semantic role; colours come from the role tokens.',
      },
      size: {
        ru: 'Ступень размера внутри текущей плотности.',
        en: 'Size step inside the current density.',
      },
      type: { ru: 'Нативный тип кнопки внутри формы.', en: 'Native button type inside a form.' },
      disabled: {
        ru: 'Блокирует активацию и убирает кнопку из порядка табуляции.',
        en: 'Blocks activation and removes the button from the tab order.',
      },
      loading: {
        ru: 'Показывает спиннер, сохраняя ширину и фокус.',
        en: 'Shows a spinner while keeping the width and the focus.',
      },
      iconOnly: {
        ru: 'Делает кнопку квадратной; определяется сам по содержимому из одной иконки.',
        en: 'Squares the button; detected automatically for a lone icon.',
      },
      as: {
        ru: 'Переопределяет тег или компонент в режиме ссылки; без него to берёт роутер.',
        en: 'Overrides the tag or component of the link mode; without it to takes the router.',
      },
      href: {
        ru: 'Адрес; переводит кнопку в режим ссылки.',
        en: 'Address; switches the button into link mode.',
      },
      to: {
        ru: 'Маршрут для RouterLink или NuxtLink приложения либо link из конфигурации; без роутера строка становится href. Тип уточняется через NuiRouteRegister.',
        en: 'Route for the app RouterLink or NuxtLink or the configured link; without a router a string becomes href. NuiRouteRegister narrows the type.',
      },
    },
    slots: {
      default: { ru: 'Содержимое кнопки: текст и иконки.', en: 'Button content: text and icons.' },
    },
    keyboard: [
      { keys: 'Enter', description: { ru: 'Активирует кнопку.', en: 'Activates the button.' } },
      { keys: 'Space', description: { ru: 'Активирует кнопку.', en: 'Activates the button.' } },
    ],
    configurator: {
      props: ['variant', 'tone', 'size', 'disabled', 'loading'],
      content: { ru: 'Сохранить', en: 'Save' },
    },
  },
};

export default docs;
