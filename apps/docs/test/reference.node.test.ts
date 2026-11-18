import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { catalogReference } from '../.vitepress/reference/catalogs';
import { parseBlocks, parseTokens } from '../.vitepress/reference/css';
import { enumerationMembers, exportedDeclarations } from '../.vitepress/reference/declarations';
import {
  buildReference,
  createReferenceChecker,
  type ReferenceChecker,
} from '../.vitepress/reference/build';
import { applyDocs, checkDocs, loadDocsDir } from '../.vitepress/reference/docs';
import { parseIconAliases } from '../.vitepress/reference/icons';
import { kitEntries } from '../.vitepress/reference/kit-entries';
import { componentReference } from '../.vitepress/reference/meta';
import { loadReferenceModule, resolveReferenceId } from '../.vitepress/reference/plugin';
import { componentEntries, familyStyleImport } from '../.vitepress/reference/sources';
import { parseThemeTokens } from '../.vitepress/reference/tokens';
import { parseBundle } from '../.vitepress/reference/bundle';
import type { ComponentReference, ReferenceBundle } from '../.vitepress/reference/reference.types';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const VUE_INDEX = `${ROOT}packages/vue/src/index.ts`;

const BUTTON_CSS = `
.nui-button { --_tone: var(--color-primary); color: var(--color-foreground); gap: --spacing(2); }
.nui-button--tone-secondary { --_tone: var(--color-secondary); outline-color: --theme(--color-ring inline); }
.nui-button__content { display: inline-flex; }
.nui-button__loader--visible { opacity: 1; --_own: var(--_tone); }
.nui-toggle-group__item--selected { color: var(--color-primary); }
`;

const THEME_CSS = `
@theme static {
  --color-surface: light-dark(oklch(1 0 0), oklch(0.21 0.006 285.89));
  --spacing: 0.25rem;
}
@theme inline {
  --color-primary-soft: color-mix(in oklab, var(--color-primary) 14%, var(--color-surface));
  --color-surface: oklch(0 0 0);
}
.nui-theme--dark { --color-surface: oklch(0 0 0); }
`;

const ICONS_SOURCE = `
export const iconAliases = {
  check: 'check',
  'chevron-down': 'chevron-down',
  loader: 'loader-circle',
} as const;
`;

const buttonEntry = () => {
  const entry = componentEntries(VUE_INDEX, '@numior/vue').find(
    (item) => item.name === 'NuiButton',
  );

  if (entry === undefined) {
    throw new Error('NuiButton is not exported');
  }
  return entry;
};

describe('docs reference', () => {
  let checker: ReferenceChecker;
  let button: ComponentReference;

  beforeAll(() => {
    checker = createReferenceChecker(ROOT);
    const entry = buttonEntry();

    button = componentReference(
      entry,
      checker.getComponentMeta(entry.file),
      { import: familyStyleImport(entry) ?? '', blocks: [], tokens: [] },
      [],
      undefined,
      enumerationMembers(`${ROOT}packages/vue/dist/index.d.ts`),
    );
  }, 30_000);

  it('lists exported components with their package, family and style import', () => {
    const entry = buttonEntry();

    expect(entry.family).toBe('button');
    expect(entry.file.endsWith('packages/vue/src/button/NuiButton.vue')).toBe(true);
    expect(familyStyleImport(entry)).toBe('@numior/vue/styles/button.css');
  });

  it('gives components of a flat entry the family and the stylesheet of that entry', () => {
    const entry = componentEntries(
      `${ROOT}packages/collaboration/src/vue/index.ts`,
      '@numior/collaboration/vue',
      { family: 'collab', styles: '@numior/collaboration/styles.css' },
    ).find((item) => item.name === 'NuiCollabPresence');

    expect(entry).toMatchObject({ package: '@numior/collaboration/vue', family: 'collab' });

    expect(entry === undefined ? undefined : familyStyleImport(entry)).toBe(
      '@numior/collaboration/styles.css',
    );
  });

  it('turns component meta into typed props, models, slots and defaults', () => {
    const variant = button.props.find((prop) => prop.name === 'variant');
    const loading = button.props.find((prop) => prop.name === 'loading');

    expect(variant).toMatchObject({
      kind: 'enum',
      type: 'NuiButtonVariant',
      default: '"solid"',
      required: false,
      values: ['solid', 'soft', 'outline', 'ghost', 'plain', 'link'],
    });

    expect(loading).toMatchObject({ kind: 'boolean', default: 'false', values: undefined });
    expect(button.slots.map((slot) => slot.name)).toEqual(['default']);
    expect(button.models).toEqual([]);
  });

  it('pairs update events with their props as models', () => {
    const entry = componentEntries(VUE_INDEX, '@numior/vue').find(
      (item) => item.name === 'NuiTabs',
    );

    if (entry === undefined) {
      throw new Error('NuiTabs is not exported');
    }

    const tabs = componentReference(
      entry,
      checker.getComponentMeta(entry.file),
      undefined,
      [],
      undefined,
    );

    expect(tabs.models).toEqual([
      {
        name: 'v-model',
        prop: 'modelValue',
        event: 'update:modelValue',
        type: 'string',
        default: undefined,
        description: undefined,
      },
    ]);

    expect(tabs.props.some((prop) => prop.name === 'modelValue')).toBe(false);

    expect(tabs.events).toEqual([
      { name: 'close', type: '[value: string]', description: undefined },
    ]);

    expect(tabs.slots.map((slot) => slot.name)).toEqual(['default', 'panel']);
  });

  it('parses BEM blocks, parts, modifiers and consumed tokens from a stylesheet', () => {
    expect(parseBlocks(BUTTON_CSS)).toEqual([
      {
        name: 'nui-button',
        parts: ['content', 'loader'],
        modifiers: ['__loader--visible', 'tone-secondary'],
      },
      { name: 'nui-toggle-group', parts: ['item'], modifiers: ['__item--selected'] },
    ]);

    expect(
      parseTokens(
        BUTTON_CSS,
        new Set(['--color-primary', '--color-secondary', '--color-foreground', '--color-ring']),
      ),
    ).toEqual([
      '--color-foreground',
      '--color-primary',
      '--color-ring',
      '--color-secondary',
      '--spacing',
    ]);
  });

  it('parses theme tokens with light and dark values and icon aliases', () => {
    expect(parseThemeTokens(THEME_CSS)).toEqual([
      {
        name: '--color-surface',
        group: 'color',
        light: 'oklch(1 0 0)',
        dark: 'oklch(0.21 0.006 285.89)',
      },
      { name: '--spacing', group: 'spacing', light: '0.25rem', dark: undefined },
      {
        name: '--color-primary-soft',
        group: 'color',
        light: 'color-mix(in oklab, var(--color-primary) 14%, var(--color-surface))',
        dark: undefined,
      },
    ]);

    expect(parseIconAliases(ICONS_SOURCE)).toEqual([
      { alias: 'check', icon: 'check' },
      { alias: 'chevron-down', icon: 'chevron-down' },
      { alias: 'loader', icon: 'loader-circle' },
    ]);
  });

  it('reads a message catalog module into localized texts', () => {
    const catalog = catalogReference({
      codeMessages: {
        namespace: 'code',
        en: { copy: 'Copy', count: ({ count }: { count: number }) => `${count} items` },
        ru: { copy: 'Скопировать', count: ({ count }: { count: number }) => `${count} шт.` },
      },
    });

    expect(catalog?.namespace).toBe('code');
    expect(catalog?.texts.copy).toEqual({ en: 'Copy', ru: 'Скопировать' });
    expect(catalog?.texts.count?.en).toContain('items');
    expect(catalogReference({ nothing: 1 })).toBeUndefined();
  });

  it('extracts exported declarations with signatures and skips components', () => {
    const declarations = exportedDeclarations(
      `${ROOT}packages/primitives/dist/index.d.ts`,
      '@numior/primitives',
      new Set(),
    );

    const hotkey = declarations.find((entry) => entry.name === 'useHotkey');
    const alias = declarations.find((entry) => entry.name === 'IconAlias');

    expect(hotkey?.kind).toBe('function');
    expect(hotkey?.signature).toContain('useHotkey: (');
    expect(alias?.kind).toBe('type');
    expect(alias?.signature.startsWith('type IconAlias =')).toBe(true);
  }, 30_000);

  it('prints an enumeration as its literal union and resolves its members', () => {
    const file = `${ROOT}packages/primitives/dist/index.d.ts`;
    const declarations = exportedDeclarations(file, '@numior/primitives', new Set());
    const orientation = declarations.find((entry) => entry.name === 'ListOrientation');
    const members = enumerationMembers(file);

    expect(orientation?.kind).toBe('type');

    expect(orientation?.signature).toBe(
      'type ListOrientation = "vertical" | "horizontal" | "both";',
    );

    expect(members.get('ListOrientation.Horizontal')).toBe('"horizontal"');
    expect(members.get('Key.Space')).toBe('" "');
  }, 30_000);

  it('merges descriptions and reports missing or stale ones', () => {
    const described = applyDocs(button, {
      props: { variant: { ru: 'Форма', en: 'Shape' } },
      slots: { default: { ru: 'Содержимое', en: 'Content' }, extra: { ru: 'x', en: 'x' } },
      keyboard: [{ keys: 'Enter', description: { ru: 'Активирует', en: '' } }],
    });

    const problems = checkDocs(button, {
      props: { variant: { ru: 'Форма', en: 'Shape' } },
      slots: { default: { ru: 'Содержимое', en: 'Content' }, extra: { ru: 'x', en: 'x' } },
      keyboard: [{ keys: 'Enter', description: { ru: 'Активирует', en: '' } }],
    });

    expect(described.props.find((prop) => prop.name === 'variant')?.description?.en).toBe('Shape');
    expect(described.keyboard).toHaveLength(1);
    expect(problems).toContain('NuiButton: props "tone" needs a RU and EN description');
    expect(problems).toContain('NuiButton: slots "extra" does not exist');
    expect(problems).toContain('NuiButton: keyboard "Enter" needs a RU and EN description');
    expect(checkDocs(button, {}).length).toBe(button.props.length + button.slots.length);
  });

  it('names every package inside the kit by the kit entry that carries it', () => {
    const kit = kitEntries(ROOT);

    expect(kit.module('@numior/vue')).toBe('@numior/kit');
    expect(kit.module('@numior/primitives')).toBe('@numior/kit');
    expect(kit.module('@numior/editor-vue')).toBe('@numior/kit/editor');
    expect(kit.module('@numior/collaboration/room')).toBe('@numior/kit/collaboration/room');
    expect(kit.sheet('@numior/vue/styles/button.css')).toBe('@numior/kit/styles/button.css');
    expect(kit.sheet('@numior/table/styles.css')).toBe('@numior/kit/table/styles.css');
    expect(kit.sheet('@numior/table/styles/table.css')).toBe('@numior/kit/table/styles/table.css');
    expect(kit.sheet('@numior/tokens/theme.css')).toBe('@numior/kit/theme.css');
    expect(kit.modules).toContain('@numior/kit/table/');
    expect(kit.modules).not.toContain('@numior/kit/');
    expect(() => kit.module('@numior/cli')).toThrow('@numior/cli has no entry in @numior/kit');
    expect(() => kit.sheet('@numior/collaboration/styles/collab.css')).toThrow('has no entry');
  });

  it('builds the whole bundle from the kit sources and the description files', async () => {
    const docs = await loadDocsDir(`${ROOT}apps/docs/api`);
    const { bundle, problems, undocumented } = await buildReference(ROOT, docs, checker);

    expect(Object.keys(docs)).toContain('NuiButton');

    expect(
      bundle.components.NuiButton?.props.find((prop) => prop.name === 'variant')?.description?.ru,
    ).toBe(docs.NuiButton?.props?.variant?.ru);

    expect(bundle.components.NuiSelect?.messages).toBe('select');
    expect(bundle.catalogs.select?.texts.empty?.ru).toBeTypeOf('string');
    expect(bundle.components.NuiForm?.package).toBe('@numior/kit/forms');
    expect(bundle.components.NuiTable?.stylesheets).toContain('@numior/kit/table/styles/table.css');
    expect(bundle.stylesheets[0]).toBe('@numior/kit/styles.css');
    expect(bundle.components.NuiButton?.file).toBe('packages/vue/src/button/NuiButton.vue');
    expect(JSON.stringify(bundle)).not.toContain(ROOT);
    expect(JSON.stringify(bundle)).not.toMatch(/@numior\/(?!kit\b)/u);
    expect(bundle.declarations.some((entry) => entry.name === 'useClipboard')).toBe(true);
    expect(bundle.tokens.some((token) => token.name === '--color-primary')).toBe(true);
    expect(bundle.icons.some((icon) => icon.alias === 'direction')).toBe(true);
    expect(problems).toEqual([]);
    expect(undocumented).not.toContain('NuiInput');
    expect(undocumented.every((name) => name.startsWith('Nui'))).toBe(true);
  }, 180_000);

  it('serves the bundle as a lazy registry and per-component slices', () => {
    const bundle: ReferenceBundle = {
      version: 1,
      components: { NuiButton: button },
      catalogs: { code: { namespace: 'code', texts: {} } },
      declarations: [
        {
          name: 'useHotkey',
          package: '@numior/primitives',
          kind: 'function',
          signature: 'useHotkey: () => void',
        },
      ],
      tokens: [],
      icons: [],
      stylesheets: [],
    };

    const current = (): ReferenceBundle => bundle;

    expect(resolveReferenceId('virtual:nui-reference')).toBe('\0virtual:nui-reference');
    expect(resolveReferenceId('vue')).toBeUndefined();

    expect(loadReferenceModule(current, '\0virtual:nui-reference')).toContain(
      '"NuiButton": () => import("virtual:nui-reference/component/NuiButton")',
    );

    expect(loadReferenceModule(current, '\0virtual:nui-reference/component/NuiButton')).toContain(
      '"name":"NuiButton"',
    );

    expect(
      loadReferenceModule(current, '\0virtual:nui-reference/component/NuiButton', (code) => [
        [{ text: code, scope: 'string' }],
      ]),
    ).toContain(
      '"importTokens":[[{"text":"@import \'@numior/vue/styles/button.css\';","scope":"string"}]]',
    );

    expect(loadReferenceModule(current, '\0virtual:nui-reference/component/nope')).toBe(
      'export default null;\n',
    );

    expect(loadReferenceModule(current, '\0virtual:nui-reference/catalog/code')).toContain(
      '"namespace":"code"',
    );

    expect(loadReferenceModule(current, '\0virtual:nui-reference')).toContain(
      '"useHotkey": () => import("virtual:nui-reference/declaration/useHotkey")',
    );

    expect(
      loadReferenceModule(current, '\0virtual:nui-reference/declaration/useHotkey', () => [
        [{ text: 'useHotkey', scope: 'function' }],
      ]),
    ).toContain('"tokens":[[{"text":"useHotkey","scope":"function"}]]');

    expect(loadReferenceModule(current, '\0virtual:nui-reference/declaration/nope')).toBe(
      'export default null;\n',
    );

    expect(loadReferenceModule(current, '\0virtual:nui-reference/tokens')).toBe(
      'export default [];\n',
    );

    expect(loadReferenceModule(current, '/src/main.ts')).toBeUndefined();

    expect(() => loadReferenceModule(current, '\0virtual:nui-reference/nope/x')).toThrow(
      'Unknown docs reference slice',
    );

    expect(parseBundle(JSON.stringify(bundle)).components.NuiButton?.name).toBe('NuiButton');
    expect(() => parseBundle('{"version":2}')).toThrow('unexpected shape');
  });
});
