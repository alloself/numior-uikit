import { mount, type VueWrapper } from '@vue/test-utils';
import type { Doc, DocJSON, DocJSONIssue } from '@numior/editor-core';
import { createSSRApp, h } from 'vue';
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
    return this.wrapper.findAll('input').map((input) => input.element.checked);
  }

  get invalid(): readonly (readonly DocJSONIssue[])[] {
    return (this.wrapper.emitted('invalid') ?? []).flatMap((args) => {
      const [issues] = args;

      return isIssues(issues) ? [issues] : [];
    });
  }

  async show(document: Doc | DocJSON): Promise<void> {
    await this.wrapper.setProps({ document });
  }

  destroy(): void {
    this.wrapper.unmount();
  }
}
