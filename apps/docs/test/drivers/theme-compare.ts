import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { ExampleFile } from '../../.vitepress/examples/example.types';
import ThemeCompare from '../../.vitepress/theme/parts/ThemeCompare.vue';
import { ru } from '../../.vitepress/theme/texts';
import { installClipboard } from '../../../../packages/primitives/test/support/clipboard';

export class ThemeCompareDriver {
  private readonly clipboard = installClipboard();

  constructor(private readonly wrapper: VueWrapper) {}

  static mount(files: readonly ExampleFile[], src = '/blocks/view/GuideTheme'): ThemeCompareDriver {
    return new ThemeCompareDriver(
      mount(ThemeCompare, {
        props: { src, height: 480, files, texts: ru },
        attachTo: document.body,
      }),
    );
  }

  get captions(): string[] {
    return this.wrapper.findAll('figcaption').map((caption) => caption.text());
  }

  get copied(): readonly string[] {
    return this.clipboard.copies;
  }

  screen(label: string): DOMWrapper<HTMLIFrameElement> {
    return this.wrapper.find<HTMLIFrameElement>(`iframe[title="${label}"]`);
  }

  async load(label: string): Promise<void> {
    await this.screen(label).trigger('load');
  }

  themeOf(label: string): string[] {
    return [
      ...(this.screen(label).element.contentDocument?.documentElement?.classList ?? []),
    ].toSorted();
  }

  async siteTheme(classes: string): Promise<void> {
    document.documentElement.className = classes;
    await nextTick();

    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
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
