export const typeInto = (element: HTMLInputElement, keys: string): void => {
  element.focus();

  for (const key of keys) {
    const before = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: key,
      bubbles: true,
      cancelable: true,
    });

    if (element.dispatchEvent(before)) {
      const at = element.selectionStart ?? element.value.length;

      element.setRangeText(key, at, element.selectionEnd ?? at, 'end');
      element.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: key }));
    }
  }
};

export const eraseBefore = (element: HTMLInputElement): void => {
  const at = element.selectionStart ?? element.value.length;

  element.focus();
  if (at > 0) {
    element.setRangeText('', at - 1, at, 'end');
  }
  element.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
};
