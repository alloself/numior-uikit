const importOf = (id: string): string => `@import '${id}/styles.css';`;

export const kitEntry = (packages: readonly string[]): string =>
  [
    '@layer theme, base, components, utilities;',
    "@import '@numior/tokens/theme.css' layer(theme);",
    "@import '@numior/tokens/base.css' layer(components);",
    importOf('@numior/vue'),
    ...packages.map(importOf),
  ].join('\n');
