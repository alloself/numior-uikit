import { nextTick } from 'vue';

export type CaretField = HTMLInputElement | HTMLTextAreaElement;

export interface CaretSelection {
  readonly start: number;
  readonly end: number;
  readonly direction: 'forward' | 'backward' | 'none' | undefined;
}

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

export const placeSelectionIn = async (
  root: HTMLElement | null,
  nameField: HTMLInputElement | null,
  text: string,
  selection: CaretSelection,
): Promise<void> => {
  await nextTick();

  const field = caretFieldIn(root, nameField);

  if (field?.value !== text) {
    return;
  }

  field.setSelectionRange(selection.start, selection.end, selection.direction);
};
