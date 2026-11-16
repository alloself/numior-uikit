import { describe, expect, it } from 'vitest';
import { kitEntry } from '../src/kit-css';
import { installModule, NuxtHost } from './harness/nuxt-host';

describe('@numior/nuxt', () => {
  it('registers the kit css, the scheme script, runtime options, components, composables and the plugin', async () => {
    const host = new NuxtHost(await installModule());

    expect(host.css).toEqual([
      expect.stringMatching(/\/numior\/kit\.css$/),
      expect.stringMatching(/\/assets\/theme\.css$/),
    ]);

    expect(host.templateOptions('numior/kit.css')).toEqual({
      packages: ['@numior/forms', '@numior/table'],
    });

    expect(await host.vitePlugins()).toContain('@tailwindcss/vite:generate:build');
    expect(host.headScripts).toEqual([host.expectedScript('light')]);
    expect(host.lang).toBe('ru');

    expect(host.runtime).toEqual({
      locale: 'ru-RU',
      colorScheme: { storageKey: 'nui-theme', initial: 'light' },
    });

    expect(host.runtimeKeys).toEqual(['colorScheme', 'locale']);

    const components = await host.components();

    expect(components.NuiButton).toBe('@numior/vue#NuiButton');
    expect(components.NuiFieldFrame).toBe('@numior/vue#NuiFieldFrame');
    expect(components.NuiForm).toBe('@numior/forms#NuiForm');
    expect(components.NuiTable).toBe('@numior/table#NuiTable');
    expect(components.NuiFormError).toBeUndefined();

    const imports = await host.imports();

    expect(imports).toContain('useToast');
    expect(imports).toContain('useForm');
    expect(imports).not.toContain('required');
    expect(await host.importPriorities()).toEqual([-1]);
    expect(host.pluginSources).toEqual([expect.stringMatching(/\/src\/runtime\/plugin\.ts$/)]);

    await host.close();
  });

  it('stays out of the way when every feature is switched off', async () => {
    const host = new NuxtHost(
      await installModule({
        numior: { css: false, components: false, composables: false, colorScheme: false },
      }),
    );

    expect(host.css).toEqual([expect.stringMatching(/\/assets\/theme\.css$/)]);
    expect(await host.vitePlugins()).toEqual([]);
    expect(host.headScripts).toEqual([]);
    expect(host.runtime).toEqual({ locale: 'ru-RU' });
    expect(host.runtimeKeys).toEqual(['locale']);
    expect(await host.components()).toEqual({});
    expect(await host.imports()).toEqual([]);
    expect(host.pluginSources).toHaveLength(1);

    await host.close();
  });

  it('writes one Tailwind entry for the kit theme and the styles of every installed package', () => {
    expect(kitEntry(['@numior/forms', '@numior/table']).split('\n')).toEqual([
      '@layer theme, base, components, utilities;',
      "@import '@numior/tokens/theme.css' layer(theme);",
      "@import '@numior/tokens/base.css' layer(components);",
      "@import '@numior/vue/styles.css';",
      "@import '@numior/forms/styles.css';",
      "@import '@numior/table/styles.css';",
    ]);
  });
});
