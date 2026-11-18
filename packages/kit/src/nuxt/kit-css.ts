export const kitEntry = (sheets: readonly string[]): string =>
  [
    '@layer theme, base, components, utilities;',
    "@import '@numior/kit/theme.css' layer(theme);",
    "@import '@numior/kit/base.css' layer(components);",
    ...sheets.map((sheet) => `@import '${sheet}';`),
  ].join('\n');
