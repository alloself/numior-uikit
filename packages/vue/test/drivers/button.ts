import { mount } from '@vue/test-utils';
import { NuiButton, type NuiButtonProps } from '../../src';
import { ComponentDriver } from './component';

export interface ButtonMountOptions {
  readonly props?: NuiButtonProps;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
  readonly onClick?: () => void;
}

export class ButtonDriver extends ComponentDriver {
  protected readonly block = 'nui-button';

  static mount({ props = {}, attrs = {}, label = 'Save', onClick }: ButtonMountOptions = {}) {
    return new ButtonDriver(
      mount(NuiButton, {
        props,
        attrs: onClick ? { ...attrs, onClick } : attrs,
        slots: { default: label },
      }),
    );
  }

  get element(): HTMLButtonElement {
    return this.wrapper.find<HTMLButtonElement>('button').element;
  }

  get type(): string | undefined {
    return this.attribute('type');
  }

  get busy(): boolean {
    return this.attribute('aria-busy') === 'true';
  }

  get disabled(): boolean {
    return this.element.disabled;
  }

  get text(): string {
    return this.wrapper.find('.nui-button__content').text();
  }

  get showsSpinner(): boolean {
    return this.wrapper.find('.nui-button__spinner').exists();
  }

  async click(): Promise<void> {
    await this.wrapper.trigger('click');
  }

  clickNatively(): void {
    this.element.click();
  }

  async update(props: NuiButtonProps): Promise<void> {
    await this.wrapper.setProps(props);
  }
}
