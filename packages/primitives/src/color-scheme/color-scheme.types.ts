export type ColorScheme = (typeof ColorScheme)[keyof typeof ColorScheme];

export type ResolvedColorScheme = Exclude<ColorScheme, typeof ColorScheme.System>;

export const ColorScheme = { System: 'system', Light: 'light', Dark: 'dark' } as const;
