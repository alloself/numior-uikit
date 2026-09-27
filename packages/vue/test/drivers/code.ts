import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { NuiCode, type NuiCodeProps, type NuiConfigOptions } from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface CodeMountOptions {
  readonly props: NuiCodeProps;
  readonly config?: NuiConfigOptions;
}

const SCOPE_PREFIX = 'nui-code__token--scope-';

export class CodeDriver extends ComponentDriver {
  protected readonly block = 'nui-code';

  static mount({ props, config }: CodeMountOptions) {
    return new CodeDriver(mount(NuiCode, { props, global: { plugins: configPlugins(config) } }));
  }

  get lineTexts(): string[] {
    return this.wrapper.findAll('.nui-code__line').map((line) => line.text());
  }

  get highlightedLines(): number[] {
    return this.wrapper
      .findAll('.nui-code__line')
      .flatMap((line, index) => (line.classes('nui-code__line--highlighted') ? [index + 1] : []));
  }

  scopesOf(line: number): string[] {
    const target = this.wrapper.findAll('.nui-code__line')[line - 1];

    if (target === undefined) {
      return [];
    }
    return target.findAll('.nui-code__token').map((token) =>
      token
        .classes()
        .filter((name) => name.startsWith(SCOPE_PREFIX))
        .map((name) => name.slice(SCOPE_PREFIX.length))
        .join(''),
    );
  }

  get title(): string | undefined {
    const title = this.wrapper.find('.nui-code__title');

    return title.exists() ? title.text() : undefined;
  }

  get language(): string | undefined {
    const language = this.wrapper.find('.nui-code__language');

    return language.exists() ? language.text() : undefined;
  }

  get copyLabel(): string | undefined {
    const copy = this.wrapper.find('.nui-code__copy');

    return copy.exists() ? copy.attributes('aria-label') : undefined;
  }

  get copyFloats(): boolean {
    return this.wrapper.find('.nui-code__copy--floating').exists();
  }

  get status(): string {
    return this.wrapper.find('.nui-code__status').text();
  }

  get expandLabel(): string | undefined {
    const expand = this.wrapper.find('.nui-code__expand');

    return expand.exists() ? expand.text() : undefined;
  }

  get expanded(): boolean {
    return this.wrapper.find('.nui-code__expand').attributes('aria-expanded') === 'true';
  }

  async copy(): Promise<void> {
    await this.wrapper.find('.nui-code__copy').trigger('click');
    await nextTick();
  }

  async toggleExpand(): Promise<void> {
    await this.wrapper.find('.nui-code__expand').trigger('click');
  }
}
