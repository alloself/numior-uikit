import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiSwitch: {
    props: fieldControl,
    models: { 'v-model': { ru: 'Включён ли переключатель.', en: 'Whether the switch is on.' } },
    slots: { default: { ru: 'Подпись рядом с треком.', en: 'Label next to the track.' } },
    keyboard: [
      { keys: 'Space', description: { ru: 'Переключает состояние.', en: 'Toggles the state.' } },
    ],
    configurator: {
      props: ['size', 'disabled', 'required', 'invalid', 'description', 'error'],
      content: { ru: 'Уведомления', en: 'Notifications' },
    },
  },
};

export default docs;
