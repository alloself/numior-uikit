import { nextTick } from 'vue';

export type CaretField = HTMLInputElement | HTMLTextAreaElement;

export const caretFieldIn = (
  root: HTMLElement | null,
  nameField: HTMLInputElement | null,
): CaretField | undefined => {
  const field = root?.ownerDocument.activeElement;

  return (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
    field !== nameField &&
    root?.contains(field) === true
    ? field
    : undefined;
};

export const placeCaretIn = async (
  root: HTMLElement | null,
  nameField: HTMLInputElement | null,
  at: number,
): Promise<void> => {
  await nextTick();
  caretFieldIn(root, nameField)?.setSelectionRange(at, at);
};
