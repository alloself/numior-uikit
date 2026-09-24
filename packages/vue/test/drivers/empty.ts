import { mount } from '@vue/test-utils';
import { NuiEmpty, type NuiEmptyProps } from '../../src';
import { ComponentDriver } from './component';

export interface EmptyMountOptions {
  readonly props?: NuiEmptyProps;
  readonly slots?: Record<string, string>;
}

export class EmptyDriver extends ComponentDriver {
  protected readonly block = 'nui-empty';

  static mount({ props = {}, slots = {} }: EmptyMountOptions = {}) {
    return new EmptyDriver(mount(NuiEmpty, { props, slots }));
  }

  get hasMedia(): boolean {
    return this.wrapper.find('.nui-empty__media').exists();
  }

  get hasIcon(): boolean {
    return this.wrapper.find('.nui-empty__icon').exists();
  }

  get titleText(): string {
    const title = this.wrapper.find('.nui-empty__title');
    return title.exists() ? title.text() : '';
  }

  get bodyText(): string {
    const body = this.wrapper.find('.nui-empty__description');
    return body.exists() ? body.text() : '';
  }

  get actionsText(): string {
    const actions = this.wrapper.find('.nui-empty__actions');
    return actions.exists() ? actions.text() : '';
  }
}
