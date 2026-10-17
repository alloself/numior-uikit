import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { EditorDriver } from './editor';

const FRAME = 20;

const settleFrames = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, FRAME);
  });

export class EditorUploadDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  static of(editor: EditorDriver): EditorUploadDriver {
    return new EditorUploadDriver(editor.vueWrapper);
  }

  private get document(): Document {
    return this.wrapper.element.ownerDocument;
  }

  private get content(): HTMLElement {
    const element = this.document.querySelector('.nui-editor__content:not(.nui-editor__static)');

    if (!(element instanceof HTMLElement)) {
      throw new Error('The editor has no content root');
    }
    return element;
  }

  private card(nth: number): Element {
    const card = this.content.querySelectorAll('.nui-editor-upload')[nth];

    if (card === undefined) {
      throw new Error(`No upload card at ${String(nth)}`);
    }
    return card;
  }

  async settle(): Promise<void> {
    await flushPromises();
    await settleFrames();
    await flushPromises();
  }

  async pasteFiles(files: readonly File[], text = ''): Promise<void> {
    const event = new Event('paste', { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clipboardData', {
      value: { files, getData: (format: string) => (format === 'text/plain' ? text : '') },
    });

    this.content.dispatchEvent(event);
    await this.settle();
  }

  get cards(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-editor-upload')].map((card) =>
      [
        card.querySelector('.nui-editor-upload__name')?.textContent?.trim() ?? '',
        card.querySelector('.nui-editor-upload__status')?.textContent?.trim() ?? '',
        card.querySelector('.nui-editor-upload__preview') === null ? 'icon' : 'preview',
      ].join('|'),
    );
  }

  get cardPlaces(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-editor__chunk > *')].map((block) =>
      block.classList.contains('nui-editor__upload')
        ? 'upload'
        : `${block.tagName.toLowerCase()}:${block.textContent ?? ''}`,
    );
  }

  actions(nth = 0): readonly string[] {
    return [...this.card(nth).querySelectorAll('button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '',
    );
  }

  async act(label: string, nth = 0): Promise<void> {
    const button = [...this.card(nth).querySelectorAll('button')].find(
      (candidate) =>
        (candidate.getAttribute('aria-label') ?? candidate.textContent?.trim()) === label,
    );

    if (!(button instanceof HTMLElement)) {
      throw new Error(`No upload action reads ${label}`);
    }
    button.click();
    await this.settle();
  }

  get announcement(): string {
    return this.document.querySelector('.nui-editor__live')?.textContent?.trim() ?? '';
  }

  private get panel(): Element {
    const panel = this.document.querySelector('.nui-editor-media');

    if (panel === null) {
      throw new Error('The media panel is not drawn');
    }
    return panel;
  }

  get panelTabs(): readonly string[] {
    return [...this.panel.querySelectorAll('[role="tab"]')].map(
      (tab) => tab.textContent?.trim() ?? '',
    );
  }

  get panelLabel(): string | null {
    return this.panel.getAttribute('aria-label');
  }

  async insertLink(url: string): Promise<void> {
    const input = this.panel.querySelector('input:not([type="file"])');
    const form = input?.closest('form');

    if (!(input instanceof HTMLInputElement) || form === null || form === undefined) {
      throw new Error('The media panel has no address field');
    }
    input.value = url;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await this.settle();
  }

  get linkError(): string {
    return this.panel.querySelector('.nui-field__error')?.textContent?.trim() ?? '';
  }

  get pickerAccept(): string | null {
    return this.panel.querySelector('input[type="file"]')?.getAttribute('accept') ?? null;
  }

  async pick(files: readonly File[]): Promise<void> {
    const picker = this.panel.querySelector('input[type="file"]');

    if (!(picker instanceof HTMLInputElement)) {
      throw new Error('The media panel has no file picker');
    }
    Object.defineProperty(picker, 'files', { configurable: true, value: files });
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    await this.settle();
  }
}
