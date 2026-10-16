import { describe, expect, it } from 'vite-plus/test';
import { composableCoverage, signatureNamesOf } from '../.vitepress/reference/coverage';
import type { DeclarationReference } from '../.vitepress/reference/reference.types';

const declarations: readonly DeclarationReference[] = [
  {
    name: 'useHotkey',
    package: '@numior/primitives',
    kind: 'function',
    signature: 'useHotkey: () => void',
  },
  {
    name: 'plural',
    package: '@numior/primitives',
    kind: 'function',
    signature: 'plural: () => string',
  },
  {
    name: 'addDays',
    package: '@numior/primitives',
    kind: 'function',
    signature: 'addDays: () => string',
  },
  {
    name: 'HotkeyOptions',
    package: '@numior/primitives',
    kind: 'type',
    signature: 'interface HotkeyOptions {}',
  },
];

describe('composable coverage', () => {
  it('reads the names of every <SignatureReference> on a page', () => {
    expect(
      signatureNamesOf(
        '<SignatureReference name="useHotkey" />\n<SignatureReference :names="[\'plural\', \'HotkeyOptions\']" />',
      ),
    ).toEqual(['useHotkey', 'plural', 'HotkeyOptions']);
  });

  it('requires every composable on a page of both locales and ignores helpers', () => {
    const pages = {
      'composables/hotkey.md': "<SignatureReference :names=\"['useHotkey', 'HotkeyOptions']\" />",
      'en/composables/hotkey.md': '<SignatureReference name="useHotkey" />',
      'guide/localization.md': '<SignatureReference name="plural" />',
    };

    expect(composableCoverage(declarations, pages)).toEqual([
      'plural: no <SignatureReference> on a en page',
    ]);
  });
});
