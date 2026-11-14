import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { markRaw, nextTick } from 'vue';
import type { ExampleFile } from '../../.vitepress/examples/example.types';
import ExampleFrame from '../../.vitepress/theme/parts/ExampleFrame.vue';
import { ru } from '../../.vitepress/theme/texts';
import { installClipboard } from '../../../../packages/primitives/test/support/clipboard';
import SampleButton from '../fixtures/SampleButton.vue';

const SampleComponent = markRaw(SampleButton);

const SCHEME_CLASS = 'nui-theme--';

export const exampleFile = (name: string, source: string): ExampleFile => ({
  name,
  language: name.endsWith('.vue') ? 'vue' : 'ts',
  source,
  tokens: undefined,
});

export class ExampleFrameDriver {
  private readonly clipboard = installClipboard();

  constructor(readonly wrapper: VueWrapper) {}

  static mount(files: readonly ExampleFile[]): ExampleFrameDriver {
    return new ExampleFrameDriver(
      mount(ExampleFrame, {
        props: { component: SampleComponent, files, texts: ru },
        attachTo: document.body,
      }),
    );
  }

  get copied(): readonly string[] {
    return this.clipboard.copies;
  }

  get preview(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`[role="group"][aria-label="${ru.preview}"]`);
  }

  get fileTabs(): string[] {
    return this.wrapper
      .findAll('[role="tab"]')
      .map((tab) => tab.text())
      .filter((name) => name !== ru.preview && name !== ru.code);
  }

  get previewTheme(): string | undefined {
    const scheme = this.preview.classes().find((name) => name.startsWith(SCHEME_CLASS));

    return scheme?.slice(SCHEME_CLASS.length);
  }

  get previewOptions(): string[] {
    return this.wrapper
      .findAll('.nui-toggle-group button')
      .map((button) => button.attributes('aria-label') ?? button.text());
  }

  get previewDirection(): string | undefined {
    return this.preview.attributes('dir');
  }

  get previewVisible(): boolean {
    return this.preview.isVisible();
  }

  get codeVisible(): boolean {
    return this.wrapper.find('.nui-code').isVisible();
  }

  get codeText(): string {
    const visible = this.wrapper.findAll('.nui-code').find((code) => code.isVisible());

    return visible === undefined ? '' : visible.find('.nui-code__code').text();
  }

  private button(...labels: readonly string[]): DOMWrapper<HTMLButtonElement> {
    const button = this.wrapper
      .findAll<HTMLButtonElement>('button')
      .find(
        (candidate) =>
          labels.includes(candidate.text()) ||
          labels.includes(candidate.attributes('aria-label') ?? ''),
      );

    if (button === undefined) {
      throw new Error(`No button "${labels.join('" or "')}"`);
    }
    return button;
  }

  unmount(): void {
    this.wrapper.unmount();
    this.clipboard.restore();
  }

  async showCode(): Promise<void> {
    await this.button(ru.code).trigger('click');
  }

  async showPreview(): Promise<void> {
    await this.button(ru.preview).trigger('click');
  }

  async toggleTheme(): Promise<void> {
    await this.button(ru.invertTheme).trigger('click');
  }

  async toggleDirection(): Promise<void> {
    await this.button(ru.rtl).trigger('click');
  }

  async copy(): Promise<void> {
    await this.button(ru.copyCode, ru.copied).trigger('click');
    await nextTick();
  }

  async selectFile(name: string): Promise<void> {
    await this.button(name).trigger('click');
  }
}
