import { mount } from '@vue/test-utils';
import { NuiSeparator, type NuiSeparatorProps } from '../../src';
import { ComponentDriver } from './component';

export interface SeparatorMountOptions {
  readonly props?: NuiSeparatorProps;
  readonly slot?: string;
}

export class SeparatorDriver extends ComponentDriver {
  protected readonly block = 'nui-separator';

  static mount({ props = {}, slot }: SeparatorMountOptions = {}) {
    const slots = slot === undefined ? {} : { default: slot };

    return new SeparatorDriver(mount(NuiSeparator, { props, slots }));
  }

  get role(): string | undefined {
    return this.attribute('role');
  }

  get orientation(): string | undefined {
    return this.attribute('aria-orientation');
  }

  get labelText(): string | undefined {
    const label = this.wrapper.find('.nui-separator__label');

    return label.exists() ? label.text() : undefined;
  }
}
