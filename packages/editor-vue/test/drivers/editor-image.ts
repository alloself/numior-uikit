import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { isShown } from '../support/popovers';
import type { EditorDriver } from './editor';

export class EditorImageDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  static of(editor: EditorDriver): EditorImageDriver {
    return new EditorImageDriver(editor.vueWrapper);
  }

  private get document(): Document {
    return this.wrapper.element.ownerDocument;
  }

  private get figure(): HTMLElement {
    const figure = this.document.querySelector(
      '.nui-editor__content:not(.nui-editor__static) .nui-content__image',
    );

    if (!(figure instanceof HTMLElement)) {
      throw new Error('The editor shows no image');
    }
    return figure;
  }

  private find<T extends Element>(selector: string, type: new () => T): T {
    const found = this.figure.querySelector(selector);

    if (!(found instanceof type)) {
      throw new Error(`The image has no ${selector}`);
    }
    return found;
  }

  get look(): string {
    return `${[...this.figure.classList].join(' ')}|${this.figure.getAttribute('style') ?? ''}`;
  }

  get grips(): readonly string[] {
    return [...this.figure.querySelectorAll('[role="slider"]')].map(
      (grip) =>
        `${grip.getAttribute('aria-label') ?? ''}:${grip.getAttribute('aria-valuenow') ?? ''}`,
    );
  }

  get barShown(): boolean {
    return isShown(this.figure.querySelector('.nui-editor-image__toolbar'));
  }

  get barControls(): readonly string[] {
    return [...this.figure.querySelectorAll('.nui-editor-image__bar :is(button, a)')]
      .filter((control) => control.closest('.nui-editor-image__alt') === null)
      .map((control) => control.getAttribute('aria-label') ?? control.textContent?.trim() ?? '');
  }

  async select(): Promise<void> {
    this.find('img', HTMLImageElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
    );

    await nextTick();
  }

  async pressGrip(key: string): Promise<void> {
    this.find('[role="slider"]', HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

    await nextTick();
  }

  async align(label: string): Promise<void> {
    const item = [...this.figure.querySelectorAll('.nui-toggle-group__item')].find(
      (button) => button.getAttribute('aria-label') === label,
    );

    if (!(item instanceof HTMLElement)) {
      throw new Error(`No alignment reads ${label}`);
    }
    item.click();
    await nextTick();
  }

  async writeCaption(text: string, key = 'Enter'): Promise<void> {
    const field = this.find('textarea', HTMLTextAreaElement);

    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await nextTick();
  }

  async describe(text: string): Promise<void> {
    const trigger = this.figure.querySelector('.nui-editor-image__bar [aria-controls]');

    if (!(trigger instanceof HTMLElement)) {
      throw new Error('The image bar has no alt text button');
    }
    trigger.click();
    await nextTick();

    const form = this.document.querySelector('.nui-editor-image__alt');
    const input = form?.querySelector('input');

    if (!(input instanceof HTMLInputElement) || form === null) {
      throw new Error('The alt text form is not open');
    }
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();
  }

  get progress(): string | undefined {
    return (
      this.figure.querySelector('.nui-editor-image__busy progress')?.getAttribute('value') ??
      undefined
    );
  }

  async replaceWith(file: File): Promise<void> {
    const picker = this.find('input[type="file"]', HTMLInputElement);

    Object.defineProperty(picker, 'files', { configurable: true, value: [file] });
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    await flushPromises();
  }
}
