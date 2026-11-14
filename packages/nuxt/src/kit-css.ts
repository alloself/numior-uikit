const THEMED = ['@numior/vue'];

export const kitEntry = (packages: readonly string[]): string =>
  [
    '@layer theme, base, components, utilities;',
    "@import '@numior/tokens/theme.css' layer(theme);",
    "@import '@numior/tokens/base.css' layer(components);",
    ...THEMED.map((id) => `@import '${id}/styles.css';`),
    ...packages.map((id) => `@import '${id}/styles.css' layer(components);`),
  ].join('\n');
