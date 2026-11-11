import { describe, expect, it } from 'vite-plus/test';
import { CodeTabsDriver, codeVariant } from './drivers/code-tabs';

const INSTALL = [
  codeVariant('pnpm', 'pnpm add @numior/vue'),
  codeVariant('npm', 'npm install @numior/vue'),
  codeVariant('yarn', 'yarn add @numior/vue'),
];

const RUN = [codeVariant('pnpm', 'pnpm dev'), codeVariant('npm', 'npm run dev')];

const SETUP = [codeVariant('Vite', 'vite.config.ts'), codeVariant('Nuxt', 'nuxt.config.ts')];

describe('CodeTabs', () => {
  it('shows the first variant of every group until the reader picks one', () => {
    const tabs = CodeTabsDriver.mount(INSTALL, SETUP);

    expect(tabs.variants(0)).toEqual(['pnpm', 'npm', 'yarn']);
    expect(tabs.shown(0)).toBe('pnpm add @numior/vue');
    expect(tabs.shown(1)).toBe('vite.config.ts');

    tabs.unmount();
  });

  it('switches every group that has the picked variant and leaves the others alone', async () => {
    const tabs = CodeTabsDriver.mount(INSTALL, RUN, SETUP);

    await tabs.pick(0, 'npm');
    expect(tabs.shown(0)).toBe('npm install @numior/vue');
    expect(tabs.shown(1)).toBe('npm run dev');
    expect(tabs.shown(2)).toBe('vite.config.ts');

    await tabs.pick(0, 'yarn');
    expect(tabs.shown(0)).toBe('yarn add @numior/vue');
    expect(tabs.shown(1)).toBe('npm run dev');

    tabs.unmount();
  });

  it('keeps the pick of one kind when the reader picks a variant of another kind', async () => {
    const tabs = CodeTabsDriver.mount(INSTALL, SETUP);

    await tabs.pick(0, 'npm');
    await tabs.pick(1, 'Nuxt');
    expect(tabs.shown(0)).toBe('npm install @numior/vue');
    expect(tabs.shown(1)).toBe('nuxt.config.ts');
    expect(tabs.stored).toBe('["Nuxt","npm"]');

    tabs.unmount();
  });
});
