import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type { NuiBreadcrumbItem, NuiConfigOptions } from '../../src';
import BreadcrumbsScene from '../fixtures/BreadcrumbsScene.vue';
import { configPlugins } from '../support/config';
import { TopLayerStubs } from '../support/top-layer';
import { ComponentDriver } from './component';

export interface BreadcrumbsMountOptions {
  readonly items?: readonly NuiBreadcrumbItem[];
  readonly maxItems?: number;
  readonly customItems?: boolean;
  readonly viaRouter?: boolean;
  readonly dir?: 'ltr' | 'rtl';
  readonly label?: string;
  readonly config?: NuiConfigOptions;
}

const PATH: readonly NuiBreadcrumbItem[] = [
  { label: 'Home', href: '/', icon: 'check' },
  { label: 'Projects', href: '/projects' },
  { label: 'Numior', href: '/projects/numior' },
  { label: 'Settings', href: '/projects/numior/settings' },
  { label: 'Billing' },
];

export class BreadcrumbsDriver extends ComponentDriver {
  protected readonly block = 'nui-breadcrumbs';

  static mount({
    items = PATH,
    maxItems,
    customItems = false,
    viaRouter = false,
    dir = 'ltr',
    label,
    config,
  }: BreadcrumbsMountOptions = {}) {
    const stubs = new TopLayerStubs();

    return new BreadcrumbsDriver(
      mount(BreadcrumbsScene, {
        props: { items, maxItems, customItems, viaRouter, dir, label },
        attachTo: document.body,
        global: { plugins: configPlugins(config) },
      }),
      stubs,
    );
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly stubs: TopLayerStubs,
  ) {
    super(wrapper);
  }

  get nav(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('nav');
  }

  get label(): string | undefined {
    return this.nav.attributes('aria-label');
  }

  get moreLabel(): string | undefined {
    return this.moreButton.attributes('aria-label');
  }

  get crumbs(): string[] {
    return this.wrapper
      .findAll('.nui-breadcrumbs__link, .nui-breadcrumbs__current')
      .map((crumb) => crumb.text());
  }

  get hrefs(): Array<string | undefined> {
    return this.wrapper.findAll('.nui-breadcrumbs__link').map((link) => link.attributes('href'));
  }

  get currentLabel(): string | undefined {
    const current = this.wrapper.find('[aria-current="page"]');
    return current.exists() ? current.text() : undefined;
  }

  get separatorCount(): number {
    return this.wrapper.findAll('.nui-breadcrumbs__separator.nui-icon').length;
  }

  get customCrumbs(): string[] {
    return this.wrapper.findAll('.custom-crumb').map((crumb) => crumb.text());
  }

  get moreButton(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-breadcrumbs__more');
  }

  get menuLabels(): string[] {
    return this.wrapper.findAll('.nui-menu-item__label').map((label) => label.text());
  }

  get menuHrefs(): Array<string | undefined> {
    return this.wrapper.findAll('.nui-menu-item').map((item) => item.attributes('href'));
  }

  async openMore(): Promise<void> {
    await this.moreButton.trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
  }

  override unmount(): void {
    this.stubs.restore();
    super.unmount();
  }
}
