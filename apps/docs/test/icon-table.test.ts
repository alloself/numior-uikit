import { describe, expect, it } from 'vite-plus/test';
import { IconTableDriver } from './drivers/icon-table';

const ICONS = [
  { alias: 'check', icon: 'check' },
  { alias: 'loader', icon: 'loader-circle' },
  { alias: 'warning', icon: 'triangle-alert' },
];

describe('IconTable', () => {
  it('lists every icon and finds one by its name or by its Lucide name', async () => {
    const table = IconTableDriver.mount(ICONS);

    expect(table.names).toEqual(['check', 'loader', 'warning']);

    await table.search('Circle');
    expect(table.names).toEqual(['loader']);

    await table.search('warn');
    expect(table.names).toEqual(['warning']);

    await table.search('');
    expect(table.names).toEqual(['check', 'loader', 'warning']);

    table.unmount();
  });

  it('copies the name that components use, not the Lucide one', async () => {
    const table = IconTableDriver.mount(ICONS);

    expect(table.copyLabels).toContain('Скопировать имя loader');

    await table.copy('loader');
    expect(table.copied).toEqual(['loader']);

    table.unmount();
  });
});
