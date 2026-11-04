export type MaskSlotKind = (typeof MaskSlotKind)[keyof typeof MaskSlotKind];

export const MaskSlotKind = { Token: 'token', Literal: 'literal' } as const;
