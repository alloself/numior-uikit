export type FieldReadonlyAttr = (typeof FieldReadonlyAttr)[keyof typeof FieldReadonlyAttr];

export const FieldReadonlyAttr = { Readonly: 'readonly', AriaReadonly: 'aria-readonly' } as const;
