import { flushPromises, mount, renderToString, type VueWrapper } from '@vue/test-utils';
import type { Doc, DocJSON, DocJSONIssue } from '@numior/editor-core';
import { vi } from 'vite-plus/test';
import { createSSRApp, nextTick, type Plugin } from 'vue';
import { renderToString as renderAppToString } from 'vue/server-renderer';
import {
  NuiContent,
  renderContent,
  type NuiContentProps,
  type RenderContentOptions,
} from '../../src';

const withoutComments = (html: string): string => html.replaceAll(/<!--[\s\S]*?-->/g, '');

const isIssues = (value: unknown): value is readonly DocJSONIssue[] => Array.isArray(value);

export class ContentDriver {
  private constructor(private readonly wrapper: VueWrapper) {}

  static mount(props: NuiContentProps, plugins: readonly Plugin[] = []): ContentDriver {
    return new ContentDriver(
      mount(NuiContent, { props, attachTo: document.body, global: { plugins: [...plugins] } }),
    );
  }

  static async ssr(props: NuiContentProps): Promise<string> {
    return withoutComments(await renderToString(NuiContent, { props }));
  }

  static async published(doc: Doc, options?: RenderContentOptions): Promise<string> {
    return withoutComments(await renderContent(doc, options));
  }

  static async hydrate(props: NuiContentProps, html?: string): Promise<readonly string[]> {
    const host = document.createElement('div');
    const warnings: string[] = [];

    host.innerHTML = html ?? (await renderAppToString(createSSRApp(NuiContent, { ...props })));
    document.body.append(host);

    const app = createSSRApp(NuiContent, { ...props });

    app.config.warnHandler = (message) => {
      warnings.push(message);
    };

    app.mount(host);
    await vi.dynamicImportSettled();
    await flushPromises();
    app.unmount();
    host.remove();
    return warnings;
  }

  get codeTitles(): readonly string[] {
    return this.wrapper.findAll('.nui-code__title').map((title) => title.text());
  }

  get codeScopes(): readonly string[] {
    return this.wrapper.findAll('.nui-code__token').flatMap((token) =>
      token.classes().flatMap((name) => {
        const scope = /^nui-code__token--scope-(.+)$/.exec(name)?.[1];

        return scope === undefined ? [] : [`${scope}:${token.text()}`];
      }),
    );
  }

  async settle(): Promise<void> {
    await flushPromises();
  }

  async iconsLoaded(): Promise<void> {
    await vi.waitFor(() => {
      const pending = this.wrapper
        .findAll('.nui-icon')
        .filter((icon) => !icon.find('svg').exists());

      if (pending.length > 0) {
        throw new Error(`${pending.length} icons are still loading`);
      }
    });
  }

  get markup(): string {
    return withoutComments(this.wrapper.html({ raw: true }));
  }

  get checks(): readonly boolean[] {
    return this.wrapper
      .findAll('.nui-content__check')
      .map((box) => box.attributes('aria-checked') === 'true');
  }

  get invalid(): readonly (readonly DocJSONIssue[])[] {
    return (this.wrapper.emitted('invalid') ?? []).flatMap((args) => {
      const [issues] = args;

      return isIssues(issues) ? [issues] : [];
    });
  }

  get tableHeads(): readonly string[] {
    return this.wrapper
      .findAll('.nui-table thead th')
      .map((cell) => cell.text().trim())
      .filter((text) => text !== '');
  }

  get tableRows(): readonly string[] {
    return this.wrapper
      .findAll('.nui-table tbody tr')
      .map((row) =>
        row
          .findAll('td')
          .map((cell) => cell.text().trim())
          .join('|'),
      )
      .filter((row) => row !== '');
  }

  get tableChecks(): readonly string[] {
    return this.wrapper
      .findAll('.nui-table tbody input[type="checkbox"]')
      .map((input) =>
        input.element instanceof HTMLInputElement
          ? `${String(input.element.checked)}:${input.attributes('aria-readonly') ?? ''}`
          : '',
      );
  }

  get tableMenus(): number {
    return this.wrapper.findAll('.nui-table thead button').length;
  }

  async clickHeader(index: number): Promise<void> {
    await this.wrapper.findAll('.nui-table thead th')[index]?.trigger('click');
  }

  get badges(): readonly string[] {
    return this.wrapper.findAll('.nui-table .nui-badge').map((badge) => badge.text().trim());
  }

  get staticTables(): number {
    return this.wrapper.findAll('table.nui-content__grid').length;
  }

  get folds(): readonly string[] {
    return this.wrapper
      .findAll('.nui-content__toggle')
      .map(
        (toggle) =>
          `${toggle.find('button').attributes('aria-label') ?? ''}:${toggle.classes().includes('nui-content__toggle--open') ? 'open' : 'closed'}:${toggle.find('button').attributes('aria-expanded') ?? ''}`,
      );
  }

  async fold(nth = 0): Promise<void> {
    const button = this.wrapper.findAll('.nui-content__toggle-button')[nth]?.element;

    if (!(button instanceof HTMLElement)) {
      throw new Error(`No fold button at ${String(nth)}`);
    }
    button.click();
    await nextTick();
  }

  get images(): readonly string[] {
    return this.wrapper
      .findAll('.nui-content__image')
      .map(
        (image) =>
          `${image.classes().join(' ')}|${image.attributes('style') ?? ''}|${image.find('.nui-content__zoom').attributes('aria-label') ?? ''}`,
      );
  }

  get viewer(): string | undefined {
    const dialog = document.querySelector('.nui-content__viewer');

    return dialog === null
      ? undefined
      : `${dialog.hasAttribute('open') ? 'open' : 'closed'}:${dialog.querySelector('.nui-content__lightbox')?.getAttribute('src') ?? ''}`;
  }

  async zoom(nth = 0): Promise<void> {
    await this.wrapper.findAll('.nui-content__zoom')[nth]?.trigger('click');
    await flushPromises();
  }

  async closeViewer(): Promise<void> {
    const close = document.querySelector('.nui-content__viewer-close > button');

    if (!(close instanceof HTMLElement)) {
      throw new Error('The image viewer is not open');
    }
    close.click();
    await flushPromises();
  }

  get embeds(): readonly string[] {
    return this.wrapper.findAll('.nui-content__embed').map((embed) => {
      const frame = embed.find('iframe');

      return frame.exists()
        ? `frame:${frame.attributes('src') ?? ''}:${frame.attributes('title') ?? ''}:${frame.attributes('sandbox') ?? ''}`
        : `link:${embed.find('a').attributes('href') ?? ''}`;
    });
  }

  get framePermissions(): readonly string[] {
    return this.wrapper
      .findAll('.nui-content__embed iframe')
      .map((frame) =>
        frame.attributes('allowfullscreen') === undefined
          ? (frame.attributes('allow') ?? '')
          : 'allowfullscreen',
      );
  }

  get captions(): readonly string[] {
    return this.wrapper
      .findAll('.nui-content__image .nui-content__caption')
      .map((caption) => caption.text());
  }

  get files(): readonly string[] {
    return this.wrapper
      .findAll('.nui-content__file')
      .map(
        (file) =>
          `${file.classes().join(' ')}|${file.attributes('href') ?? ''}|${file.attributes('download') ?? ''}|${file.text()}`,
      );
  }

  async show(document: Doc | DocJSON): Promise<void> {
    await this.wrapper.setProps({ document });
  }

  destroy(): void {
    this.wrapper.unmount();
  }
}
