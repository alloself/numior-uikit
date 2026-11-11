const THEMED = ['@numior/vue'];

export const kitEntry = (): string =>
  [
    '@layer theme, base, components, utilities;',
    "@import '@numior/tokens/theme.css' layer(theme);",
    "@import '@numior/tokens/base.css' layer(components);",
    ...THEMED.map((id) => `@import '${id}/styles.css';`),
  ].join('\n');

export const layersEntry = (packages: readonly string[]): string =>
  packages.map((id) => `@import '${id}/styles.css' layer(components);`).join('\n');
