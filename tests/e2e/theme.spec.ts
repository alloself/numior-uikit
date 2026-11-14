import { expect, test } from './fixtures';
import { schemeCaseName } from './pages/theme-lab';
import type { Scheme, SchemeCase, SchemeScope } from './pages/theme-lab';

const SCOPES: readonly SchemeScope[] = ['light', 'dark', 'system'];
const ROOTS: readonly (SchemeScope | null)[] = [null, ...SCOPES];
const DEVICES: readonly Scheme[] = ['light', 'dark'];
const OWN_SOFT = 'rgb(1, 2, 3)';
const OWN_HIGHLIGHT = 'rgb(4, 5, 6)';

const CHAINS: readonly (readonly SchemeScope[])[] = [
  [],
  ...SCOPES.map((scope) => [scope]),
  ...SCOPES.flatMap((outer) => SCOPES.map((inner) => [outer, inner])),
  ['light', 'dark', 'light', 'dark'],
  ['dark', 'light', 'dark', 'light'],
  ['system', 'dark', 'system', 'light'],
];

const CASES: readonly SchemeCase[] = CHAINS.flatMap((scopes) =>
  [null, ...SCOPES].map((own) => ({ scopes, own })),
);

const nearestScheme = (item: SchemeCase, root: SchemeScope | null, device: Scheme): Scheme => {
  const nearest = [item.own, ...item.scopes.toReversed(), root].find((scope) => scope !== null);

  return nearest === undefined || nearest === 'system' ? device : nearest;
};

const accentScopes = (theme: string): string => `
  <div class="${theme}">
    <p class="text-primary-soft-foreground bg-syntax-highlight" aria-label="${theme} theme">x</p>
    <div class="nui-theme--accent-blue">
      <p class="text-primary-soft-foreground bg-syntax-highlight" aria-label="${theme} accent">x</p>
    </div>
  </div>`;

test('the dark variant picks the same scheme as light-dark() in every nesting of scopes', async ({
  themeLab,
}) => {
  const mismatches: string[] = [];

  for (const root of ROOTS) {
    for (const device of DEVICES) {
      await themeLab.openSchemes(CASES, { root, device });

      const expected = new Map(
        CASES.map((item) => [schemeCaseName(item), nearestScheme(item, root, device)]),
      );

      for (const probe of await themeLab.schemeProbes()) {
        const scheme = expected.get(probe.name);
        const agrees = probe.variant === scheme && probe.native === scheme;

        if (agrees) {
          continue;
        }

        mismatches.push(
          `root ${root ?? 'none'}, device ${device}, ${probe.name}: ${probe.variant}`,
        );
      }
    }
  }

  expect(CASES).toHaveLength(64);
  expect(mismatches).toEqual([]);
});

test('an accent inside a theme with its own soft text and highlight takes those of the accent', async ({
  themeLab,
}) => {
  const ownTheme = `.own-theme { --color-accent-soft-foreground: ${OWN_SOFT}; --color-accent-syntax-highlight: ${OWN_HIGHLIGHT}; }`;

  await themeLab.open(`${accentScopes('own-theme')}${accentScopes('kit-theme')}`, {
    css: ownTheme,
  });

  const accentSoft = await themeLab.styleOf('kit-theme accent', 'color');
  const accentHighlight = await themeLab.styleOf('kit-theme accent', 'background-color');

  expect(await themeLab.styleOf('own-theme theme', 'color')).toBe(OWN_SOFT);
  expect(await themeLab.styleOf('own-theme theme', 'background-color')).toBe(OWN_HIGHLIGHT);
  expect(await themeLab.styleOf('own-theme accent', 'color')).toBe(accentSoft);
  expect(await themeLab.styleOf('own-theme accent', 'background-color')).toBe(accentHighlight);
  expect(accentSoft).not.toBe(await themeLab.styleOf('kit-theme theme', 'color'));
});
