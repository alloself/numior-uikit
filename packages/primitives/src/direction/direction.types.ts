export type Direction = (typeof Direction)[keyof typeof Direction];

export const Direction = { Ltr: 'ltr', Rtl: 'rtl' } as const;
