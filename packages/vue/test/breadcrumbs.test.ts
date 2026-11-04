import { describe, expect, it } from 'vite-plus/test';
import { BreadcrumbsDriver } from './drivers/breadcrumbs';

describe('NuiBreadcrumbs', () => {
  it('renders a labelled trail of links ending in the current page', () => {
    const crumbs = BreadcrumbsDriver.mount();
    expect(crumbs.label).toBe('Breadcrumb');
    expect(crumbs.crumbs).toEqual(['Home', 'Projects', 'Numior', 'Settings', 'Billing']);

    expect(crumbs.hrefs).toEqual([
      '/',
      '/projects',
      '/projects/numior',
      '/projects/numior/settings',
    ]);

    expect(crumbs.currentLabel).toBe('Billing');
    expect(crumbs.separatorCount).toBe(4);
    expect(crumbs.moreButton.exists()).toBe(false);

    crumbs.unmount();
  });

  it('collapses the middle of a long trail into a menu that keeps the hidden links', async () => {
    const crumbs = BreadcrumbsDriver.mount({ maxItems: 3 });
    expect(crumbs.crumbs).toEqual(['Home', 'Billing']);
    expect(crumbs.separatorCount).toBe(2);
    expect(crumbs.moreLabel).toBe('Show path');
    expect(crumbs.moreButton.attributes('aria-haspopup')).toBe('menu');

    await crumbs.openMore();
    expect(crumbs.menuLabels).toEqual(['Projects', 'Numior', 'Settings']);

    expect(crumbs.menuHrefs).toEqual([
      '/projects',
      '/projects/numior',
      '/projects/numior/settings',
    ]);

    crumbs.unmount();
    const wide = BreadcrumbsDriver.mount({ maxItems: 4 });
    expect(wide.crumbs).toEqual(['Home', 'Settings', 'Billing']);

    wide.unmount();
  });

  it('lets the item slot render every crumb with its position', () => {
    const crumbs = BreadcrumbsDriver.mount({ customItems: true, maxItems: 4 });
    expect(crumbs.customCrumbs).toEqual(['0:Home', '3:Settings', '4:Billing*']);
    expect(crumbs.separatorCount).toBe(3);

    crumbs.unmount();
  });

  it('renders visible and collapsed links through a router component', async () => {
    const crumbs = BreadcrumbsDriver.mount({ viaRouter: true, maxItems: 3 });
    expect(crumbs.hrefs).toEqual(['/router/']);

    await crumbs.openMore();

    expect(crumbs.menuHrefs).toEqual([
      '/router/projects',
      '/router/projects/numior',
      '/router/projects/numior/settings',
    ]);

    crumbs.unmount();
  });

  it('names the trail and the collapsed part in the configured language unless labelled', () => {
    const russian = BreadcrumbsDriver.mount({ maxItems: 3, config: { locale: 'ru-RU' } });
    expect(russian.label).toBe('Навигационная цепочка');
    expect(russian.moreLabel).toBe('Показать путь');

    russian.unmount();

    const labelled = BreadcrumbsDriver.mount({ label: 'Путь', config: { locale: 'ru-RU' } });
    expect(labelled.label).toBe('Путь');

    labelled.unmount();
  });
});
