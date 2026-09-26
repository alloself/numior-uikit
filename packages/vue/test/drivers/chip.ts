import { mount, type DOMWrapper } from '@vue/test-utils';
import { NuiChip, type NuiChipProps, type NuiConfigOptions } from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface ChipMountOptions {
  readonly props?: NuiChipProps;
  readonly label?: string;
  readonly config?: NuiConfigOptions;
}

export class ChipDriver extends ComponentDriver {
  protected readonly block = 'nui-chip';

  static mount({ props = {}, label = 'Vue', config }: ChipMountOptions = {}) {
    return new ChipDriver(
      mount(NuiChip, {
        props,
        slots: { default: label },
        global: { plugins: configPlugins(config) },
      }),
    );
  }

  get text(): string {
    return this.wrapper.find('.nui-chip__label').text();
  }

  get hasIcon(): boolean {
    return this.wrapper.find('.nui-chip__icon').exists();
  }

  get removeButton(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-chip__remove');
  }

  get removeLabel(): string | undefined {
    return this.removeButton.attributes('aria-label');
  }

  get emittedRemove(): number {
    return (this.wrapper.emitted('remove') ?? []).length;
  }

  async clickRemove(): Promise<void> {
    await this.removeButton.trigger('click');
  }
}
