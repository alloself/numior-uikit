export const typeInto = (field: HTMLInputElement | null, text: string): void => {
  if (field === null) {
    return;
  }

  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

export const composeInto = (field: HTMLInputElement | null, text: string): void => {
  if (field === null) {
    return;
  }

  field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
  field.value = text;
  field.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
};

export const commitComposed = (field: HTMLInputElement | null, text: string): void => {
  if (field === null) {
    return;
  }

  field.value = text;
  field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
};
