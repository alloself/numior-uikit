const LAYERED = new Set(['@numior/vue', '@numior/forms', '@numior/charts', '@numior/content']);

const importOf = (id: string): string =>
  LAYERED.has(id) ? `@import '${id}/styles.css';` : `@import '${id}/styles.css' layer(components);`;

export const kitEntry = (packages: readonly string[]): string =>
  [
    '@layer theme, base, components, utilities;',
    "@import '@numior/tokens/theme.css' layer(theme);",
    "@import '@numior/tokens/base.css' layer(components);",
    importOf('@numior/vue'),
    ...packages.map(importOf),
  ].join('\n');
