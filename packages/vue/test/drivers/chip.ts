import { mount, type DOMWrapper } from '@vue/test-utils';
import { NuiChip, type NuiChipProps } from '../../src';
import { ComponentDriver } from './component';

export interface ChipMountOptions {
  readonly props?: NuiChipProps;
  readonly label?: string;
}

export class ChipDriver extends ComponentDriver {
  protected readonly block = 'nui-chip';

  static mount({ props = {}, label = 'Vue' }: ChipMountOptions = {}) {
    return new ChipDriver(mount(NuiChip, { props, slots: { default: label } }));
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

  get emittedRemove(): number {
    return (this.wrapper.emitted('remove') ?? []).length;
  }

  async clickRemove(): Promise<void> {
    await this.removeButton.trigger('click');
  }
}
