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

  get fieldLabels(): string[] {
    return this.wrapper.findAll('.nui-field__label').map((label) => label.text());
  }

  private control(label: string): DOMWrapper<Element> {
    const field = this.wrapper
      .findAll('.nui-field')
      .find((candidate) => candidate.find('.nui-field__label').text() === label);

    if (field === undefined) {
      throw new Error(`No field "${label}"`);
    }
    return field;
  }

  async toggle(label: string): Promise<void> {
    await this.control(label).find('input[type="checkbox"]').setValue(true);
  }

  async typeContent(text: string): Promise<void> {
    await this.control(ru.configuratorContent).find('input').setValue(text);
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
