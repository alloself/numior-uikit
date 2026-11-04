import { describe, expect, it } from 'vitest';
import { installModule, NuxtHost } from './harness/nuxt-host';

describe('@numior/nuxt', () => {
  it('registers the kit css, the scheme script, runtime options, components, composables and the plugin', async () => {
    const host = new NuxtHost(await installModule());

    expect(host.css).toEqual([
      '@numior/tokens/theme.css',
      '@numior/tokens/base.css',
      '@numior/vue/styles.css',
      '@numior/forms/styles.css',
      '@numior/table/styles.css',
    ]);

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

    expect(host.css).toEqual([]);
    expect(host.headScripts).toEqual([]);
    expect(host.runtime).toEqual({ locale: 'ru-RU' });
    expect(host.runtimeKeys).toEqual(['locale']);
    expect(await host.components()).toEqual({});
    expect(await host.imports()).toEqual([]);
    expect(host.pluginSources).toHaveLength(1);

    await host.close();
  });
});
