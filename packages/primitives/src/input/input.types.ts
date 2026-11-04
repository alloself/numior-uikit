export type InputType = (typeof InputType)[keyof typeof InputType];

export const InputType = {
  InsertText: 'insertText',
  InsertReplacementText: 'insertReplacementText',
  InsertFromPaste: 'insertFromPaste',
  InsertFromDrop: 'insertFromDrop',
  DeleteContentBackward: 'deleteContentBackward',
  DeleteWordBackward: 'deleteWordBackward',
  DeleteSoftLineBackward: 'deleteSoftLineBackward',
  DeleteHardLineBackward: 'deleteHardLineBackward',
} as const;
