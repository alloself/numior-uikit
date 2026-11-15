import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { sourceCssAliases } from '../../../scripts/source-css.ts';
import { parseRules } from '../../parity/css-rules.ts';
import type { CssRule } from '../../parity/css-rules.types.ts';

export interface KitBuildOptions {
  readonly theme?: string;
  readonly classes?: readonly string[];
}

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ALIASES = sourceCssAliases();
const LAYER = /@layer ([a-z-]+)/;
const LAYER_ORDER = /@layer ([a-z, -]+);/g;

const PACKAGES = [
  'forms',
  'table',
  'spreadsheet',
  'charts',
  'content',
  'editor-vue',
  'collaboration',
];

const LAYERED = new Set(['forms', 'charts']);

const importOf = (name: string): string =>
  LAYERED.has(name)
    ? `@import '@numior/${name}/styles.css';`
    : `@import '@numior/${name}/styles.css' layer(components);`;

const ENTRY = [
  "@import 'tailwindcss';",
  "@import '@numior/tailwind';",
  "@import '@numior/vue/styles.css';",
  ...PACKAGES.map(importOf),
];

const sourceOf = async (id: string): Promise<string | undefined> => {
  const alias = ALIASES.find(({ find }) => find.test(id));

  return alias === undefined ? undefined : id.replace(alias.find, alias.replacement);
};

const layerOf = (rule: CssRule): string => LAYER.exec(rule.context)?.[1] ?? '';

export const kitCss = async ({
  theme = '',
  classes = [],
}: KitBuildOptions = {}): Promise<string> => {
  const compiler = await compile([...ENTRY, theme].join('\n'), {
    base: ROOT,
    onDependency: () => undefined,
    customCssResolver: sourceOf,
  });

  return compiler.build([...classes]);
};

export class KitBuild {
  private readonly rules: readonly CssRule[];
  readonly layerOrder: readonly string[];

  constructor(css: string) {
    const names = Array.from(css.matchAll(LAYER_ORDER), ([, order = '']) => order.split(','));

    this.rules = parseRules(css);
    this.layerOrder = Array.from(new Set(names.flat().map((name) => name.trim())));
  }

  layersOf(selector: string): string[] {
    const layers = this.rules.reduce((found, rule) => {
      return rule.selector === selector ? found.add(layerOf(rule)) : found;
    }, new Set<string>());

    return Array.from(layers);
  }

  selectorsDeclaring(property: string): string[] {
    return this.rules.reduce<string[]>((found, rule) => {
      if (rule.declarations.some((declaration) => declaration.property === property)) {
        found.push(rule.selector);
      }
      return found;
    }, []);
  }

  valueOf(selector: string, property: string): string | undefined {
    return this.rules.reduce<string | undefined>((value, rule) => {
      const declared = rule.declarations.findLast((declaration) => {
        return declaration.property === property;
      });

      return rule.selector === selector && declared !== undefined ? declared.value : value;
    }, undefined);
  }

  overrides(utility: string, component: string): boolean {
    const rank = (selector: string): number[] => {
      return this.layersOf(selector).map((layer) => this.layerOrder.indexOf(layer));
    };

    const [utilityRanks, componentRanks] = [rank(utility), rank(component)];

    return (
      utilityRanks.length > 0 &&
      componentRanks.length > 0 &&
      Math.min(...utilityRanks) > Math.max(...componentRanks)
    );
  }
}
