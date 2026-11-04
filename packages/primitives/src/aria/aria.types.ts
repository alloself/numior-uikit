export type AriaValue = (typeof AriaValue)[keyof typeof AriaValue];

export const AriaValue = { True: 'true', False: 'false', Mixed: 'mixed' } as const;
