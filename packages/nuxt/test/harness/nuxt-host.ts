import { fileURLToPath } from 'node:url';
import { loadNuxt, runWithNuxtContext } from '@nuxt/kit';
import type { Nuxt, NuxtConfig, NuxtHooks } from '@nuxt/schema';
import { colorSchemeScript, type ColorScheme } from '@numior/vue';
import { isString, shapeOf } from '../../../primitives/test/support/guards';
import module from '../../src/module';

type RegisteredComponents = Parameters<NuxtHooks['components:extend']>[0];
type RegisteredImports = Parameters<NuxtHooks['imports:extend']>[0];
type ViteExtension = Parameters<NuxtHooks['vite:extend']>[0];

const FIXTURE = fileURLToPath(new URL('../fixture/', import.meta.url));

const isSourced = shapeOf({ src: isString });
const isScript = shapeOf({ innerHTML: isString });
const isNamed = shapeOf({ name: isString });

export const installModule = async (overrides: NuxtConfig = {}): Promise<Nuxt> => {
  const nuxt = await loadNuxt({ cwd: FIXTURE, ready: false, overrides });

  await runWithNuxtContext(nuxt, () => module({}, nuxt));
  return nuxt;
};

export class NuxtHost {
  constructor(readonly nuxt: Nuxt) {}

  get css(): string[] {
    return this.nuxt.options.css;
  }

  get runtime(): unknown {
    return this.nuxt.options.runtimeConfig.public.numior;
  }

  get runtimeKeys(): string[] {
    return Object.keys(this.nuxt.options.runtimeConfig.public.numior).toSorted();
  }

  get headScripts(): string[] {
    return (this.nuxt.options.app.head.script ?? []).reduce<string[]>((found, script) => {
      if (isScript(script)) {
        found.push(script.innerHTML);
      }
      return found;
    }, []);
  }

  get lang(): unknown {
    return this.nuxt.options.app.head.htmlAttrs?.lang;
  }

  expectedScript(initial: ColorScheme): string {
    return colorSchemeScript('nui-theme', initial);
  }

  get pluginSources(): string[] {
    return this.nuxt.options.plugins.reduce<string[]>((found, plugin) => {
      if (isSourced(plugin)) {
        found.push(plugin.src);
      }
      return found;
    }, []);
  }

  async components(): Promise<Record<string, string>> {
    const list: RegisteredComponents = [];

    await this.nuxt.callHook('components:extend', list);
    return Object.fromEntries(
      list.map((component) => [component.pascalName, `${component.filePath}#${component.export}`]),
    );
  }

  async imports(): Promise<string[]> {
    const list: RegisteredImports = [];

    await this.nuxt.callHook('imports:extend', list);
    return list.map((entry) => entry.name);
  }

  async importPriorities(): Promise<number[]> {
    const list: RegisteredImports = [];

    await this.nuxt.callHook('imports:extend', list);
    return [...new Set(list.map((entry) => entry.priority ?? 0))];
  }

  async vitePlugins(): Promise<string[]> {
    const extension: ViteExtension = { nuxt: this.nuxt, config: { plugins: [] } };

    await this.nuxt.callHook('vite:extend', extension);

    return (extension.config.plugins ?? []).flat().reduce<string[]>((names, plugin) => {
      if (isNamed(plugin)) {
        names.push(plugin.name);
      }
      return names;
    }, []);
  }

  async close(): Promise<void> {
    await this.nuxt.close();
  }
}
