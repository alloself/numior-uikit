export type PointerType = (typeof PointerType)[keyof typeof PointerType];

export const PointerType = { Mouse: 'mouse', Pen: 'pen', Touch: 'touch' } as const;
