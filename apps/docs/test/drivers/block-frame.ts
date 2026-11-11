import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import type { ExampleFile } from '../../.vitepress/examples/example.types';
import BlockFrame from '../../.vitepress/theme/parts/BlockFrame.vue';
import { ru } from '../../.vitepress/theme/texts';
import { installClipboard } from '../../../../packages/primitives/test/support/clipboard';

export class BlockFrameDriver {
  private readonly clipboard = installClipboard();

  constructor(private readonly wrapper: VueWrapper) {}

  static mount(files: readonly ExampleFile[]): BlockFrameDriver {
    return new BlockFrameDriver(
      mount(BlockFrame, {
        props: { name: 'SignIn', src: '/blocks/view/SignIn', height: 600, files, texts: ru },
        attachTo: document.body,
      }),
    );
  }

  get copied(): readonly string[] {
    return this.clipboard.copies;
  }

  get screen(): DOMWrapper<HTMLIFrameElement> {
    return this.wrapper.find<HTMLIFrameElement>('iframe');
  }

  get screenWidth(): string {
    return this.screen.element.style.maxInlineSize;
  }

  get openLink(): string | undefined {
    return this.wrapper.find(`a[aria-label="${ru.blockOpen}"]`).attributes('href');
  }

  get fileNames(): string[] {
    return this.wrapper
      .findAll(`[role="tablist"][aria-label="${ru.exampleFiles}"] [role="tab"]`)
      .map((tab) => tab.text());
  }

  async resize(label: string): Promise<void> {
    await this.wrapper.find(`[role="radio"][aria-label="${label}"]`).trigger('click');
  }

  async showCode(): Promise<void> {
    const tab = this.wrapper
      .findAll('[role="tab"]')
      .find((candidate) => candidate.text() === ru.code);

    if (tab === undefined) {
      throw new Error('No code tab');
    }
    await tab.trigger('click');
  }

  async copy(): Promise<void> {
    await this.wrapper.find(`button[aria-label="${ru.copyCode}"]`).trigger('click');
  }

  unmount(): void {
    this.wrapper.unmount();
    this.clipboard.restore();
  }
}
