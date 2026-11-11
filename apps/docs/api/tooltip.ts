import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiTooltip: {
    configurator: {
      scene: 'tooltip/Example',
      props: ['placement', 'offset', 'openDelay', 'closeDelay', 'disabled'],
    },
    props: {
      id: {
        ru: 'Идентификатор подсказки. По умолчанию создаётся автоматически.',
        en: 'Id of the tooltip. Generated automatically by default.',
      },
      placement: {
        ru: 'С какой стороны триггера появляется подсказка, например `top` или `bottom-start`.',
        en: 'Side of the trigger the tooltip appears on, such as `top` or `bottom-start`.',
      },
      offset: { ru: 'Отступ от триггера в пикселях.', en: 'Distance from the trigger in pixels.' },
      openDelay: {
        ru: 'Через сколько миллисекунд после наведения появляется подсказка.',
        en: 'Delay in milliseconds before the tooltip shows on hover.',
      },
      closeDelay: {
        ru: 'Через сколько миллисекунд после ухода курсора подсказка скрывается.',
        en: 'Delay in milliseconds before the tooltip hides after the pointer leaves.',
      },
      disabled: { ru: 'Отключает подсказку.', en: 'Disables the tooltip.' },
      anchor: {
        ru: 'Элемент-триггер вместо слота `trigger`. Объект `{ within, selector }` даёт одну подсказку всем элементам по селектору внутри `within` или слота. Между соседними она переходит без задержки.',
        en: 'Trigger element in place of the `trigger` slot. An object `{ within, selector }` gives one tooltip to every match inside `within` or the slot. It moves between neighbours without a delay.',
      },
    },
    models: {
      'v-model:open': { ru: 'Показана ли подсказка.', en: 'Whether the tooltip is shown.' },
    },
    slots: {
      trigger: {
        ru: 'Элемент, к которому относится подсказка. Передайте ему `attrs` через `v-bind`.',
        en: 'Element the tooltip belongs to. Bind `attrs` to it with `v-bind`.',
      },
      default: {
        ru: 'Текст подсказки. С целями в `anchor` получает `target` — элемент под курсором или в фокусе.',
        en: 'Tooltip text. With targets in `anchor`, it receives `target`, the hovered or focused element.',
      },
    },
    keyboard: [
      {
        keys: 'Tab',
        description: {
          ru: 'Показывает подсказку без задержки, когда фокус попадает на триггер.',
          en: 'Shows the tooltip without a delay when the trigger receives focus.',
        },
      },
      { keys: 'Escape', description: { ru: 'Скрывает подсказку.', en: 'Hides the tooltip.' } },
    ],
  },
};

export default docs;
