import { describe, expect, it } from 'vite-plus/test';
import {
  attributeSelectors,
  attributeWrites,
  derivedReads,
  rootScopeLists,
  selfDeclarations,
  themeFindings,
  themeKeysOf,
} from './theme-guards.mjs';

const THEME = `
@theme static {
  --color-primary: light-dark(oklch(0.5 0.2 277), oklch(0.7 0.1 277));
  --radius-base: 0.5rem;
}

@theme inline {
  --color-ring: var(--color-primary);
  --radius-md: var(--radius-base);
}
`;

const KEYS = themeKeysOf(THEME);

const css = (path, source) => ({ path, source });

describe('theme guards of check:styles', () => {
  it('tells base keys from derived keys', () => {
    expect([...KEYS.all]).toEqual([
      '--color-primary',
      '--radius-base',
      '--color-ring',
      '--radius-md',
    ]);

    expect([...KEYS.derived]).toEqual(['--color-ring', '--radius-md']);
  });

  it('rejects a data attribute in a selector of a stylesheet or a style block', () => {
    const sheet = css(
      'kit.css',
      '.nui-tabs {}\n.nui-tabs[data-orientation="vertical"] { gap: 0; }',
    );

    const vue = css(
      'Part.vue',
      '<template><i /></template>\n<style>\n[data-state] { opacity: 0; }\n</style>',
    );

    const clean = css('clean.css', '/* [data-x] */\n.nui-tabs--vertical { gap: 0; }');

    expect(attributeSelectors(sheet)).toEqual([
      expect.stringMatching(/^kit\.css:2: attribute-selector: \[data-orientation/u),
    ]);

    expect(attributeSelectors(vue)).toEqual([
      expect.stringMatching(/^Part\.vue:3: attribute-selector: \[data-state/u),
    ]);

    expect(attributeSelectors(clean)).toEqual([]);
  });

  it('rejects code that writes a data-nui attribute and keeps test hooks', () => {
    const template = css(
      'Frame.vue',
      '<template>\n  <div :data-nui-theme="scheme" data-testid="frame" />\n</template>',
    );

    const script = css('scheme.ts', 'root.dataset.nuiAccent = accent;\nroot.dataset.testid = "x";');

    expect(attributeWrites(template)).toEqual([
      expect.stringMatching(/^Frame\.vue:2: attribute-write: data-nui-theme/u),
    ]);

    expect(attributeWrites(script)).toEqual([
      expect.stringMatching(/^scheme\.ts:1: attribute-write: dataset\.nuiAccent/u),
    ]);
  });

  it('rejects a theme key that redeclares itself', () => {
    const sheet = css(
      'scope.css',
      '.scope {\n  --color-primary: --theme(--color-primary inline);\n  --radius-md: var(--radius-md);\n  --color-ring: --theme(--color-primary inline);\n}',
    );

    expect(selfDeclarations(sheet)).toEqual([
      expect.stringMatching(/^scope\.css:2: self-declaration: --color-primary:/u),
      expect.stringMatching(/^scope\.css:3: self-declaration: --radius-md:/u),
    ]);
  });

  it('rejects theme keys on a selector list of the root and a scope', () => {
    const sheet = css(
      'theme.css',
      ':root,\n.nui-theme--system {\n  --nui-scheme: light;\n  color-scheme: light dark;\n}\n:root, .brand {\n  --color-primary: red;\n}\n.brand { --color-primary: red; }',
    );

    expect(rootScopeLists(sheet, KEYS)).toEqual([
      expect.stringMatching(
        /^theme\.css:6: root-scope-list: :root, \.brand declares --color-primary/u,
      ),
    ]);
  });

  it('rejects a read of a derived key through var() or an arbitrary utility', () => {
    const sheet = css(
      'button.css',
      '.nui-button {\n  outline-color: var(--color-ring);\n  border-radius: --theme(--radius-md inline);\n}',
    );

    const template = css(
      'Card.vue',
      '<template>\n  <div class="rounded-(--radius-md) bg-(--color-primary)" />\n</template>',
    );

    expect(derivedReads(sheet, KEYS)).toEqual([
      expect.stringMatching(/^button\.css:2: derived-read: var\(--color-ring/u),
    ]);

    expect(derivedReads(template, KEYS)).toEqual([
      expect.stringMatching(/^Card\.vue:2: derived-read: -\(--radius-md/u),
    ]);
  });

  it('collects every guard over a list of files', () => {
    const files = [
      css('a.css', '[data-nui-theme] { --color-primary: --theme(--color-primary inline); }'),
      css('b.ts', "el.setAttribute('data-nui-theme', 'dark');"),
    ];

    expect(themeFindings(files, THEME).map((line) => line.split(': ')[1])).toEqual([
      'attribute-selector',
      'attribute-write',
      'self-declaration',
      'attribute-write',
    ]);
  });
});
