import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { NuiKbd, type NuiKbdProps } from '../../src';
import { ComponentDriver } from './component';

export interface KbdMountOptions {
  readonly props?: NuiKbdProps;
  readonly slot?: string;
}

export class KbdDriver extends ComponentDriver {
  protected readonly block = 'nui-kbd';

  static mount({ props = {}, slot }: KbdMountOptions = {}) {
    const slots = slot === undefined ? {} : { default: slot };

    return new KbdDriver(mount(NuiKbd, { props, slots }));
  }

  get keys(): string[] {
    return this.wrapper.findAll('.nui-kbd__key').map((key) => key.text());
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  async update(props: NuiKbdProps): Promise<void> {
    await this.wrapper.setProps(props);
  }
}
