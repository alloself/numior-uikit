import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { markRaw } from 'vue';
import { NuiButton, NuiSeparator } from '@numior/vue';
import type { ExampleModule } from '../../.vitepress/examples/example.types';
import type { ComponentReference } from '../../.vitepress/reference/reference.types';
import ConfiguratorFrame from '../../.vitepress/theme/parts/ConfiguratorFrame.vue';
import { ru } from '../../.vitepress/theme/texts';
import SendScene from '../fixtures/SendScene.vue';
import { referenceOf } from './api-component';
import { exampleFile } from './example-frame';

const SEND_SOURCE = `<template>
  <NuiButton @click="sent = true">{{ sent ? 'Отправлено' : 'Отправить' }}</NuiButton>
</template>`;

export const sendScene = (): ExampleModule => ({
  component: markRaw(SendScene),
  files: [
    exampleFile('Example.vue', SEND_SOURCE),
    exampleFile('team.ts', 'export const team = [];'),
  ],
});

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

export const configurableScene = (): ComponentReference => {
  const button = configurableButton();

  return {
    ...button,
    configurator: {
      props: ['variant', 'disabled'],
      choices: { variant: ['solid', 'soft'] },
      scene: 'button/Example',
    },
  };
};

export const configurableSeparator = (): ComponentReference =>
  referenceOf({
    name: 'NuiSeparator',
    props: [
      {
        name: 'label',
        type: 'string',
        kind: 'string',
        required: false,
        default: undefined,
        values: undefined,
        description: undefined,
      },
    ],
    configurator: { props: ['label'], values: { label: { ru: 'или', en: 'or' } } },
  });

export class ConfiguratorFrameDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(component: ComponentReference, scene?: ExampleModule): ConfiguratorFrameDriver {
    return new ConfiguratorFrameDriver(
      mount(ConfiguratorFrame, {
        props: { component, locale: 'ru', texts: ru, scene },
        global: { components: { NuiButton, NuiSeparator } },
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

  get separatorLabel(): string {
    return this.preview.find('.nui-separator__label').text();
  }

  get fileNames(): string[] {
    return this.wrapper
      .findAll(`[role="tablist"][aria-label="${ru.exampleFiles}"] [role="tab"]`)
      .map((tab) => tab.text());
  }

  choicesOf(name: string): string[] {
    return this.wrapper
      .find(`.nui-toggle-group[aria-label="${name}"]`)
      .findAll('button')
      .map((item) => item.text());
  }

  get code(): string {
    return this.wrapper.find('.nui-code__code').text();
  }

  async showCode(): Promise<void> {
    const tab = this.wrapper
      .findAll('[role="tab"]')
      .find((candidate) => candidate.text() === ru.code);

    if (tab === undefined) {
      throw new Error('No code tab');
    }
    await tab.trigger('click');
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
