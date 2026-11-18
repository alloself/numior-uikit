import { describe, expect, it } from 'vitest';
import { buildFixture, startFixture } from './harness/vite-app';

describe('an app built with numior()', () => {
  it('ships the styles and the code of the kit components its templates use and no others', async () => {
    const app = await buildFixture();

    expect(app.css).toContain('.nui-button');
    expect(app.css).toContain('.nui-badge');
    expect(app.css).not.toContain('.nui-table');
    expect(app.css).not.toContain('.nui-editor');
    expect(app.css).toContain('@layer components');

    expect(app.js).not.toContain('resolveComponent("NuiButton")');
    expect(app.js).toContain('nui-button');
  });

  it('ships every kit stylesheet without the styles step and leaves components to Vue without the components step', async () => {
    const app = await buildFixture({ styles: false, components: false });

    expect(app.css).toContain('.nui-button');
    expect(app.css).toContain('.nui-table');
    expect(app.js).toContain('resolveComponent("NuiButton")');
  });

  it('grows the styles on the dev server when a new file starts using a kit component', async () => {
    const app = await startFixture();

    expect(await app.styles()).toContain('.nui-badge');
    expect(await app.styles()).not.toContain('.nui-table');

    await app.add('src/Orders.vue', '<template><NuiTable :rows="[]" :columns="[]" /></template>');

    await expect.poll(() => app.styles(), { timeout: 10_000 }).toContain('.nui-table');

    await app.close();
  });
});
