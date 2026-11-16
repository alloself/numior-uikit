import { describe, expect, it } from 'vite-plus/test';
import {
  compareRules,
  foldColorMixFallbacks,
  parseAliases,
  parseFixedKeys,
  parseHelpers,
  parseRules,
} from './css-rules';
import type { CssEnvironment } from './css-rules.types';

const ALIASES = parseAliases(`
  :root {
    --nui-primary: var(--color-primary);
    --nui-space-2: calc(var(--spacing) * 2);
    --nui-radius: var(--radius-md);
  }
`);

const ENVIRONMENT: CssEnvironment = {
  aliases: ALIASES,
  fixed: parseFixedKeys(['@theme static { --spacing: 0.25rem; --font-weight-medium: 500; }'], []),
  helpers: parseHelpers(`
    @property --tw-border-style { syntax: "*"; inherits: false; initial-value: solid; }
    @property --tw-translate-x { syntax: "*"; inherits: false; initial-value: 0; }
    @property --tw-leading { syntax: "*"; inherits: false; }
  `),
};

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

const compare = (before: string, after: string): ReturnType<typeof compareRules> =>
  compareRules(parseRules(before), kit(after), ENVIRONMENT);

describe('rule comparison of a rewritten stylesheet', () => {
  it('reads rules with their at-rule context in source order', () => {
    expect(parseRules(OLD).map((rule) => [rule.context, rule.selector])).toEqual([
      ['', '.nui-button'],
      ['', '.nui-button:hover:not(:disabled, .nui-button--loading)'],
      ['@starting-style', '.nui-button[open]'],
      ['@keyframes nui-spin', 'to'],
    ]);
  });

  it('reads a selector the formatter broke inside its parentheses as one line', () => {
    const wrapped = parseRules(
      '@media (pointer: coarse) { .a:is(\n  .b,\n  .c\n) { color: red; } }',
    );

    expect(wrapped.map((rule) => [rule.context, rule.selector])).toEqual([
      ['@media (pointer: coarse)', '.a:is(.b, .c)'],
    ]);
  });

  it('accepts renamed tokens, reordered unrelated declarations and equal zero lengths', () => {
    expect(compare(OLD, NEW)).toEqual({ issues: [], resets: [] });
  });

  it('names a lost, a gained and a changed declaration', () => {
    const changed = NEW.replace('gap: calc(var(--spacing) * 2);', 'gap: 8px; cursor: pointer;');

    expect(compare(OLD, changed).issues).toEqual([
      '| .nui-button: lost gap: 0.5rem',
      '| .nui-button: gained gap: 8px',
      '| .nui-button: gained cursor: pointer',
    ]);
  });

  it('keeps a shorthand before the longhand that refines it', () => {
    const old = '.a { font: inherit; line-height: 1; }';
    const next = '.a { line-height: 1; font: inherit; }';

    expect(compare(old, next).issues).toEqual(['| .a: font must stay before line-height']);
  });

  it('rejects a moved, a merged and an added rule', () => {
    const moved = NEW.replace('@starting-style {', '@media (hover: hover) {');
    const extra = `${NEW} .nui-button--round { border-radius: 9999px; }`;

    expect(compare(OLD, moved).issues).toEqual([
      'rule 3: expected @starting-style | .nui-button[open], found @media (hover: hover) | .nui-button[open]',
    ]);

    expect(compare(OLD, extra).issues).toEqual(['extra rule | .nui-button--round']);

    expect(compareRules(parseRules(OLD), [], ENVIRONMENT).issues[0]).toBe(
      'rule 1: expected | .nui-button, found nothing',
    );
  });

  it('reads a utility through its helper variables and the spacing scale', () => {
    const old = `.a {
      padding-block: 0.25rem;
      border: 1px solid transparent;
      translate: 0 calc(var(--spacing) * 2);
      margin-inline-start: calc(var(--spacing) - calc(var(--spacing) * 2));
      font-weight: 500;
    }`;

    const next = `.a {
      padding-block: var(--spacing);
      border-style: var(--tw-border-style);
      border-width: 1px;
      border-color: transparent;
      --tw-translate-y: calc(var(--spacing) * 2);
      translate: var(--tw-translate-x) var(--tw-translate-y);
      margin-inline-start: calc(var(--spacing) * -1);
      --tw-font-weight: var(--font-weight-medium);
      font-weight: var(--font-weight-medium);
    }`;

    expect(compare(old, next)).toEqual({ issues: [], resets: [] });
  });

  it('lists the resets a longhand utility drops', () => {
    expect(compare('.a { background: var(--x); }', '.a { background-color: var(--x); }')).toEqual({
      issues: [],
      resets: [
        {
          rule: '| .a',
          index: 0,
          properties: [
            'background-image',
            'background-position-x',
            'background-position-y',
            'background-size',
            'background-repeat',
            'background-origin',
            'background-clip',
            'background-attachment',
          ],
        },
      ],
    });
  });

  it('refuses a dropped reset that an earlier rule needs', () => {
    const old = '.a { background-clip: padding-box; } .b { background: red; }';
    const next = '.a { background-clip: padding-box; } .b { background-color: red; }';

    expect(compare(old, next).issues).toEqual([
      '| .b: drops the reset of background-clip, which | .a sets',
    ]);
  });

  it('accepts a dropped reset that a later rule of equal weight overrides', () => {
    const old = '.a { text-decoration: none; } .a:hover { text-decoration-thickness: 2px; }';
    const next = '.a { text-decoration-line: none; } .a:hover { text-decoration-thickness: 2px; }';

    expect(compare(old, next).issues).toEqual([]);
  });

  it('takes flex-start for start on a grid the rule or the block of its subject sets', () => {
    const old = `.a { display: grid; align-content: start; }
      .b { display: flex; }
      .a--x { align-items: start; }
      .b--x { align-items: start; }
      .a--x .c { justify-content: start; }`;

    const next = `.a { display: grid; align-content: flex-start; }
      .b { display: flex; }
      .a--x { align-items: flex-start; }
      .b--x { align-items: flex-start; }
      .a--x .c { justify-content: flex-start; }`;

    expect(compare(old, next).issues).toEqual([
      '| .b--x: lost align-items: start',
      '| .b--x: gained align-items: flex-start',
      '| .a--x .c: lost justify-content: start',
      '| .a--x .c: gained justify-content: flex-start',
    ]);
  });

  it('keeps start apart from flex-start where another rule makes the same element a flexbox', () => {
    const old = `.a { display: grid; align-content: start; }
      .b { display: grid; align-items: start; }
      .c { display: grid; justify-items: start; }
      @media (width < 40rem) { .a, .b { display: flex; flex-wrap: wrap; } }`;

    const next = `.a { display: grid; align-content: flex-start; }
      .b { display: grid; align-items: flex-start; }
      .c { display: grid; justify-items: flex-start; }
      @media (width < 40rem) { .a, .b { display: flex; flex-wrap: wrap; } }`;

    expect(compare(old, next).issues).toEqual([
      '| .a: lost align-content: start',
      '| .a: gained align-content: flex-start',
      '| .b: lost align-items: start',
      '| .b: gained align-items: flex-start',
    ]);
  });

  it('keeps start apart from flex-start where a rule on the same subject drops the grid', () => {
    const old = `.a { display: grid; align-items: start; }
      .p .a { display: contents; }
      .b { display: grid; align-items: start; }
      .b::before { display: block; }
      .b:has(> .a) { align-content: start; }`;

    const next = `.a { display: grid; align-items: flex-start; }
      .p .a { display: contents; }
      .b { display: grid; align-items: flex-start; }
      .b::before { display: block; }
      .b:has(> .a) { align-content: flex-start; }`;

    expect(compare(old, next).issues).toEqual([
      '| .a: lost align-items: start',
      '| .a: gained align-items: flex-start',
    ]);
  });

  it('refuses a helper variable that another rule sets', () => {
    const old = '.a { line-height: 1; } .b { line-height: 1.5; }';
    const setter = '.a { --tw-leading: 1; line-height: 1; }';
    const next = `${setter} .b { line-height: var(--tw-leading, 1.5); }`;

    expect(compare(old, next).issues).toEqual([
      '| .b: reads --tw-leading, which another rule sets',
    ]);
  });

  it('resolves only theme keys that no scope sets again', () => {
    const fixed = parseFixedKeys(
      [
        '@theme default { --radius-base: 0.5rem; --spacing: 1px; @keyframes x { to { opacity: 0; } } }',
        '@theme static { --spacing: 0.25rem; } @theme inline { --radius: var(--radius-base); }',
      ],
      ['.docs-theme { --radius-base: 0.25rem; }'],
    );

    expect(Array.from(fixed)).toEqual([['--spacing', '0.25rem']]);
  });

  it('folds the color-mix fallback of the compiler back into its rule', () => {
    const compiled = parseRules(`
      .nui-alert {
        border-color: var(--_tone);
        @supports (color: color-mix(in lab, red, red)) {
          border-color: color-mix(in oklab, var(--_tone) 50%, var(--color-border));
        }
        color: red;
      }
      .nui-alert__icon { color: blue; }
    `);

    const { rules, fallbacks } = foldColorMixFallbacks(compiled);

    expect(fallbacks).toBe(1);

    expect(rules).toEqual([
      {
        context: '',
        selector: '.nui-alert',
        declarations: [
          {
            property: 'border-color',
            value: 'color-mix(in oklab, var(--_tone) 50%, var(--color-border))',
          },
          { property: 'color', value: 'red' },
        ],
      },
      {
        context: '',
        selector: '.nui-alert__icon',
        declarations: [{ property: 'color', value: 'blue' }],
      },
    ]);
  });
});
