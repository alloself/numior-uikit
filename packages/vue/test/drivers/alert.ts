import { mount, type DOMWrapper } from '@vue/test-utils';
import { NuiAlert, type NuiAlertProps, type NuiConfigOptions } from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface AlertMountOptions {
  readonly props?: NuiAlertProps;
  readonly open?: boolean;
  readonly slots?: Record<string, string | (new () => unknown)>;
  readonly config?: NuiConfigOptions;
}

export class AlertDriver extends ComponentDriver {
  protected readonly block = 'nui-alert';

  static mount({ props = {}, open, slots = {}, config }: AlertMountOptions = {}) {
    return new AlertDriver(
      mount(NuiAlert, {
        props: { ...props, ...(open === undefined ? {} : { open }) },
        slots,
        global: { plugins: configPlugins(config) },
      }),
    );
  }

  get role(): string | undefined {
    return this.attribute('role');
  }

  get titleText(): string {
    return this.wrapper.find('.nui-alert__title').text();
  }

  get bodyText(): string {
    return this.wrapper.find('.nui-alert__description').text();
  }

  get actions(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-alert__actions');
  }

  get hasIcon(): boolean {
    return this.wrapper.find('.nui-alert__icon').exists();
  }

  get closeButton(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-alert__close');
  }

  get closeLabel(): string | undefined {
    return this.closeButton.attributes('aria-label');
  }

  get emittedClose(): number {
    return (this.wrapper.emitted('close') ?? []).length;
  }

  get emittedOpen(): boolean[] {
    return (this.wrapper.emitted('update:open') ?? []).flatMap(([value]) =>
      typeof value === 'boolean' ? [value] : [],
    );
  }

  async clickClose(): Promise<void> {
    await this.closeButton.trigger('click');
  }

  async receiveOpen(value: boolean): Promise<void> {
    await this.wrapper.setProps({ open: value });
  }
}
