import { describe, expect, it } from 'vitest';
import { installModule, NuxtHost } from './harness/nuxt-host';

describe('@numior/kit/nuxt', () => {
  it('registers the kit css, the scheme script, runtime options, components, composables and the plugin', async () => {
    const host = new NuxtHost(await installModule());

    expect(host.css).toEqual([
      '@numior/kit/theme.css',
      '@numior/kit/base.css',
      '@numior/kit/styles.css',
      '@numior/kit/forms/styles.css',
      '@numior/kit/table/styles.css',
    ]);

    expect(host.headScripts).toEqual([host.expectedScript('light')]);
    expect(host.lang).toBe('ru');

    expect(host.runtime).toEqual({
      locale: 'ru-RU',
      colorScheme: { storageKey: 'nui-theme', initial: 'light' },
    });

    expect(host.runtimeKeys).toEqual(['colorScheme', 'locale']);

    const components = await host.components();

    expect(components.NuiButton).toBe('@numior/kit#NuiButton');
    expect(components.NuiFieldFrame).toBe('@numior/kit#NuiFieldFrame');
    expect(components.NuiForm).toBe('@numior/kit/forms#NuiForm');
    expect(components.NuiTable).toBe('@numior/kit/table#NuiTable');
    expect(components.NuiFormError).toBeUndefined();

    const imports = await host.imports();

    expect(imports).toContain('useToast');
    expect(imports).toContain('useForm');
    expect(imports).not.toContain('required');
    expect(await host.importPriorities()).toEqual([-1]);

    expect(host.pluginSources).toEqual([
      expect.stringMatching(/\/src\/nuxt\/runtime\/plugin\.ts$/),
    ]);

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
