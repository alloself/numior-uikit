export type BuiltInLocale = (typeof BuiltInLocale)[keyof typeof BuiltInLocale];

export const BuiltInLocale = { En: 'en', Ru: 'ru' } as const;
