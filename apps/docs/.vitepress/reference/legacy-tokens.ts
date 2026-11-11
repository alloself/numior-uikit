const ALIAS_RE = /(--nui-[a-z0-9-]+):\s*([^;]+);/g;
const THEME_BLOCK_RE = /@theme static \{([^}]*)\}/;
const DECLARATION_RE = /(--[a-z0-9-]+):\s*([^;]+);/g;
const REFERENCE_RE = /var\((--[a-z0-9-]+)\)/g;
const SINGLE_REFERENCE_RE = /^var\((--[a-z0-9-]+)\)$/;
const STEP_RE = /^calc\(var\(--spacing\) \* (\d+)\)$/;
const LENGTH_RE = /^([\d.]+)([a-z]+)$/;

const squash = (value: string): string =>
  value.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();

const declarationsOf = (css: string, pattern: RegExp): [string, string][] =>
  Array.from(css.matchAll(pattern), ([, name = '', value = '']) => [name, squash(value)]);

const themeNameOf = (expression: string): string | undefined =>
  SINGLE_REFERENCE_RE.exec(expression)?.[1];

const legacyNamesOf = (aliases: readonly [string, string][]): Map<string, string> => {
  return aliases.reduce((names, [legacy, expression]) => {
    const themeName = themeNameOf(expression);

    if (themeName !== undefined && !themeName.startsWith('--nui-') && !names.has(themeName)) {
      names.set(themeName, legacy);
    }
    return names;
  }, new Map<string, string>());
};

const stepOf = (expression: string, unit: string | undefined): string | undefined => {
  const [, count] = STEP_RE.exec(expression) ?? [];
  const [, size, suffix] = LENGTH_RE.exec(unit ?? '') ?? [];

  return count === undefined || size === undefined
    ? undefined
    : `${Number(size) * Number(count)}${suffix}`;
};

export const withLegacyNames = (css: string, themeCss: string): string => {
  const names = legacyNamesOf(declarationsOf(themeCss, ALIAS_RE));

  return css.replace(/--[a-z][a-z0-9-]*/g, (name) => names.get(name) ?? name);
};

export const legacyTokenCss = (themeCss: string): string => {
  const aliases = declarationsOf(themeCss, ALIAS_RE);
  const names = legacyNamesOf(aliases);
  const theme = new Map(declarationsOf(THEME_BLOCK_RE.exec(themeCss)?.[1] ?? '', DECLARATION_RE));

  const literalOf = (expression: string): string => {
    const value = theme.get(themeNameOf(expression) ?? '');

    return value === undefined
      ? (stepOf(expression, theme.get('--spacing')) ?? expression)
      : value.replace(REFERENCE_RE, (whole, name: string) => {
          return names.has(name) ? `var(${names.get(name)})` : whole;
        });
  };

  return aliases.map(([legacy, expression]) => `${legacy}: ${literalOf(expression)};`).join('\n');
};
