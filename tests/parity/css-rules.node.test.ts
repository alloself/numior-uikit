import { describe, expect, it } from 'vite-plus/test';
import { canonical, compareRules, parseAliases, parseRules } from './css-rules';

const ALIASES = parseAliases(`
  :root, [data-nui-theme] {
    --nui-primary: var(--color-primary);
    --nui-space-2: calc(var(--spacing) * 2);
    --nui-radius: var(--radius-md);
  }
`);

const OLD = `
  .nui-button {
    --_tone: var(--nui-primary);

    box-sizing: border-box;
    gap: var(--nui-space-2);
    margin: 0;
    border: 1px solid transparent;
    border-radius: var(--nui-radius);
    transition:
      opacity .2s ease,
      display 0.2s allow-discrete;
  }
  .nui-button:hover:not(:disabled, .nui-button--loading) { background: var(--_hover); }
  @starting-style {
    .nui-button[open] { opacity: 0; }
  }
  @keyframes nui-spin { to { rotate: 1turn; } }
`;

const NEW = `
  @layer theme { :root { --color-primary: red; } }
  .nui-button {
    box-sizing: border-box;
    margin: 0px;
    gap: calc(var(--spacing) * 2);
    border-radius: var(--radius-md);
    --_tone: var(--color-primary);
    border: 1px solid transparent;
    transition: opacity 0.2s ease, display 0.2s allow-discrete;
  }
  .nui-button:hover:not(:disabled, .nui-button--loading) { background: var(--_hover); }
  @starting-style {
    .nui-button[open] { opacity: 0; }
  }
  @keyframes nui-spin { to { rotate: 1turn; } }
`;

const kit = (source: string): ReturnType<typeof parseRules> =>
  parseRules(source).filter((rule) => !rule.context.startsWith('@layer theme'));

describe('rule comparison of a rewritten stylesheet', () => {
  it('reads rules with their at-rule context in source order', () => {
    expect(parseRules(OLD).map((rule) => [rule.context, rule.selector])).toEqual([
      ['', '.nui-button'],
      ['', '.nui-button:hover:not(:disabled, .nui-button--loading)'],
      ['@starting-style', '.nui-button[open]'],
      ['@keyframes nui-spin', 'to'],
    ]);
  });

  it('accepts renamed tokens, reordered unrelated declarations and equal zero lengths', () => {
    expect(compareRules(parseRules(OLD), kit(NEW), ALIASES)).toEqual([]);
  });

  it('names a lost, a gained and a changed declaration', () => {
    const changed = NEW.replace('gap: calc(var(--spacing) * 2);', 'gap: 8px; cursor: pointer;');

    expect(compareRules(parseRules(OLD), kit(changed), ALIASES)).toEqual([
      '| .nui-button: lost gap: calc(var(--spacing) * 2)',
      '| .nui-button: gained gap: 8px',
      '| .nui-button: gained cursor: pointer',
    ]);
  });

  it('keeps a shorthand before the longhand that refines it', () => {
    const old = '.a { font: inherit; line-height: 1; border: 0; border-color: red; }';
    const next = '.a { line-height: 1; font: inherit; border-color: red; border: 0; }';

    expect(compareRules(parseRules(old), parseRules(next), ALIASES)).toEqual([
      '| .a: font must stay before line-height',
      '| .a: border must stay before border-color',
    ]);
  });

  it('rejects a moved, a merged and an added rule', () => {
    const moved = NEW.replace('@starting-style {', '@media (hover: hover) {');
    const extra = `${NEW} .nui-button--round { border-radius: 9999px; }`;

    expect(compareRules(parseRules(OLD), kit(moved), ALIASES)).toEqual([
      'rule 3: expected @starting-style | .nui-button[open], found @media (hover: hover) | .nui-button[open]',
    ]);

    expect(compareRules(parseRules(OLD), kit(extra), ALIASES)).toEqual([
      'extra rule | .nui-button--round',
    ]);

    expect(compareRules(parseRules(OLD), [], ALIASES)[0]).toBe(
      'rule 1: expected | .nui-button, found nothing',
    );
  });

  it('writes values in one form', () => {
    expect(canonical("var(--nui-radius) .5rem 0px 'x'", ALIASES)).toBe(
      'var(--radius-md) 0.5rem 0 "x"',
    );
  });
});
