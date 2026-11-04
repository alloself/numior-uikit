export type FloatingSide = (typeof FloatingSide)[keyof typeof FloatingSide];

export type FloatingStrategy = (typeof FloatingStrategy)[keyof typeof FloatingStrategy];

export const FloatingSide = { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' } as const;

export const FloatingStrategy = { Fixed: 'fixed', Absolute: 'absolute' } as const;
