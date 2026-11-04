export type VirtualAxis = (typeof VirtualAxis)[keyof typeof VirtualAxis];

export type VirtualAlign = (typeof VirtualAlign)[keyof typeof VirtualAlign];

export type SizeModelKind = (typeof SizeModelKind)[keyof typeof SizeModelKind];

export const VirtualAxis = { X: 'x', Y: 'y' } as const;

export const VirtualAlign = { Auto: 'auto', Start: 'start', Center: 'center', End: 'end' } as const;

export const SizeModelKind = { Fixed: 'fixed', Variable: 'variable', Indexed: 'indexed' } as const;
