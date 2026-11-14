import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { ExampleFile } from '../../.vitepress/examples/example.types';
import { blockHeightMessage } from '../../.vitepress/theme/block-height';
import BlockFrame from '../../.vitepress/theme/parts/BlockFrame.vue';
import { ru } from '../../.vitepress/theme/texts';
import { installClipboard } from '../../../../packages/primitives/test/support/clipboard';

export class BlockFrameDriver {
  private readonly clipboard = installClipboard();

  constructor(private readonly wrapper: VueWrapper) {}

  static mount(files: readonly ExampleFile[], src = '/blocks/view/SignIn'): BlockFrameDriver {
    return new BlockFrameDriver(
      mount(BlockFrame, {
        props: { name: 'SignIn', src, height: 600, files, texts: ru },
        attachTo: document.body,
      }),
    );
  }

  static mountOnSite(siteClasses: string, files: readonly ExampleFile[]): BlockFrameDriver {
    document.documentElement.className = siteClasses;

    return BlockFrameDriver.mount(files, 'about:blank');
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

  get screenHeight(): string {
    return this.screen.element.style.blockSize;
  }

  get themeClasses(): string[] {
    return [...(this.screen.element.contentDocument?.documentElement?.classList ?? [])].toSorted();
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

  async report(
    height: number,
    source: Window | null = this.screen.element.contentWindow,
  ): Promise<void> {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: blockHeightMessage(height),
        origin: location.origin,
        source,
      }),
    );

    await nextTick();
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
    document.documentElement.className = '';
  }
}
