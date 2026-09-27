import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { NuiButton } from '@numior/vue';
import type { ComponentReference } from '../../.vitepress/reference/reference.types';
import ConfiguratorFrame from '../../.vitepress/theme/parts/ConfiguratorFrame.vue';
import { ru } from '../../.vitepress/theme/texts';
import { referenceOf } from './api-component';

export const configurableButton = (): ComponentReference =>
  referenceOf({
    name: 'NuiButton',
    props: [
      {
        name: 'variant',
        type: 'NuiButtonVariant',
        kind: 'enum',
        required: false,
        default: '"solid"',
        values: ['solid', 'soft', 'outline'],
        description: undefined,
      },
      {
        name: 'disabled',
        type: 'boolean',
        kind: 'boolean',
        required: false,
        default: 'false',
        values: undefined,
        description: undefined,
      },
      {
        name: 'href',
        type: 'string',
        kind: 'string',
        required: false,
        default: undefined,
        values: undefined,
        description: undefined,
      },
    ],
    configurator: { props: ['variant', 'disabled'], content: { ru: 'Сохранить', en: 'Save' } },
  });

export class ConfiguratorFrameDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(component: ComponentReference): ConfiguratorFrameDriver {
    return new ConfiguratorFrameDriver(
      mount(ConfiguratorFrame, {
        props: { component, locale: 'ru', texts: ru },
        global: { components: { NuiButton } },
        attachTo: document.body,
      }),
    );
  }

  get preview(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`[role="group"][aria-label="${ru.preview}"]`);
  }

  get button(): DOMWrapper<HTMLButtonElement> {
    return this.preview.find<HTMLButtonElement>('button');
  }

  get code(): string {
    return this.wrapper.find('.nui-code__code').text();
  }

  get optionNames(): string[] {
    return this.wrapper
      .findAll('.nui-toggle-group--variant-segmented, .nui-field__label, .nui-switch__label')
      .map((element) => element.attributes('aria-label') ?? element.text());
  }

  async choose(name: string, value: string): Promise<void> {
    const item = this.wrapper
      .find(`.nui-toggle-group[aria-label="${name}"]`)
      .findAll('button')
      .find((candidate) => candidate.text() === value);

    if (item === undefined) {
      throw new Error(`No option "${value}" for "${name}"`);
    }
    await item.trigger('click');
  }

  async toggle(label: string): Promise<void> {
    const control = this.wrapper
      .findAll('.nui-switch')
      .find((candidate) => candidate.find('.nui-switch__label').text() === label);

    if (control === undefined) {
      throw new Error(`No switch "${label}"`);
    }
    await control.find('input[type="checkbox"]').setValue(true);
  }

  async typeContent(text: string): Promise<void> {
    const field = this.wrapper.findAll('.nui-field').find((candidate) => {
      const label = candidate.find('.nui-field__label');

      return label.exists() && label.text() === ru.configuratorContent;
    });

    if (field === undefined) {
      throw new Error('No content field');
    }
    await field.find('input').setValue(text);
  }

  async reset(): Promise<void> {
    const button = this.wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === ru.reset);

    if (button === undefined) {
      throw new Error('No reset button');
    }
    await button.trigger('click');
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
