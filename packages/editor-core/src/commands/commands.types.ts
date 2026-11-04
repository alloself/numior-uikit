export type BesideSide = (typeof BesideSide)[keyof typeof BesideSide];

export const BesideSide = { Start: 'start', End: 'end' } as const;
