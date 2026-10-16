import { mount, type VueWrapper } from '@vue/test-utils';
import type { Doc, DocJSON, DocJSONIssue } from '@numior/editor-core';
import { createSSRApp, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiContent, type NuiContentProps } from '../../src';

const withoutComments = (html: string): string => html.replaceAll(/<!--[\s\S]*?-->/g, '');

const isIssues = (value: unknown): value is readonly DocJSONIssue[] => Array.isArray(value);

export class ContentDriver {
  private constructor(private readonly wrapper: VueWrapper) {}

  static mount(props: NuiContentProps): ContentDriver {
    return new ContentDriver(mount(NuiContent, { props, attachTo: document.body }));
  }

  static async ssr(props: NuiContentProps): Promise<string> {
    return withoutComments(
      await renderToString(createSSRApp({ render: () => h(NuiContent, props) })),
    );
  }

  static async hydrate(props: NuiContentProps): Promise<readonly string[]> {
    const host = document.createElement('div');
    const warnings: string[] = [];

    host.innerHTML = await renderToString(createSSRApp({ render: () => h(NuiContent, props) }));
    document.body.append(host);

    const app = createSSRApp({ render: () => h(NuiContent, props) });

    app.config.warnHandler = (message) => {
      warnings.push(message);
    };

    app.mount(host);
    app.unmount();
    host.remove();
    return warnings;
  }

  get markup(): string {
    return withoutComments(this.wrapper.html({ raw: true }));
  }

  get checks(): readonly boolean[] {
    return this.wrapper
      .findAll('.nui-content__check')
      .flatMap((input) =>
        input.element instanceof HTMLInputElement ? [input.element.checked] : [],
      );
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

  async show(document: Doc | DocJSON): Promise<void> {
    await this.wrapper.setProps({ document });
  }

  destroy(): void {
    this.wrapper.unmount();
  }
}
