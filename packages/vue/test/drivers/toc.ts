import { mount, type DOMWrapper } from '@vue/test-utils';
import { NuiToc, type NuiConfigOptions, type NuiTocItem, type NuiTocProps } from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface TocMountOptions {
  readonly props?: Partial<NuiTocProps>;
  readonly config?: NuiConfigOptions;
}

const TOC_ITEMS: readonly NuiTocItem[] = [
  { id: 'install', label: 'Install' },
  {
    id: 'usage',
    label: 'Usage',
    children: [
      { id: 'basic', label: 'Basic' },
      { id: 'advanced', label: 'Advanced' },
    ],
  },
  { id: 'api', label: 'API' },
];

export class TocDriver extends ComponentDriver {
  protected readonly block = 'nui-toc';

  static mount({ props = {}, config }: TocMountOptions = {}) {
    return new TocDriver(
      mount(NuiToc, {
        props: { items: TOC_ITEMS, ...props },
        global: { plugins: configPlugins(config) },
      }),
    );
  }

  get title(): string | undefined {
    const title = this.wrapper.find('.nui-toc__title');

    return title.exists() ? title.text() : undefined;
  }

  get label(): string | undefined {
    return this.attribute('aria-label');
  }

  get links(): DOMWrapper<HTMLAnchorElement>[] {
    return this.wrapper.findAll<HTMLAnchorElement>('.nui-toc__link');
  }

  get hrefs(): string[] {
    return this.links.map((link) => link.attributes('href') ?? '');
  }

  get currentLabel(): string | undefined {
    return this.links.find((link) => link.attributes('aria-current') === 'location')?.text();
  }

  depthOf(label: string): number | undefined {
    const link = this.links.find((candidate) => candidate.text() === label);
    const list = link?.element.closest('.nui-toc__list');

    const depth = [...(list?.classList ?? [])]
      .find((name) => name.startsWith('nui-toc__list--depth-'))
      ?.slice('nui-toc__list--depth-'.length);

    return depth === undefined ? undefined : Number(depth);
  }

  get emittedSelections(): string[] {
    return (this.wrapper.emitted('select') ?? []).flatMap(([id]) =>
      typeof id === 'string' ? [id] : [],
    );
  }

  async click(label: string): Promise<void> {
    const link = this.links.find((candidate) => candidate.text() === label);

    if (!link) {
      throw new Error(`No link labelled ${label}`);
    }
    await link.trigger('click');
  }
}
