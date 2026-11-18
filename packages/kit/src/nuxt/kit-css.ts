const KIT_ENTRY = [
  '@layer theme, base, components, utilities;',
  "@import '@numior/kit/theme.css' layer(theme);",
  "@import '@numior/kit/base.css' layer(components);",
  "@import '@numior/kit/styles.css';",
].join('\n');

export const kitEntry = (): string => KIT_ENTRY;
