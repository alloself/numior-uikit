const IME_PROCESS_KEY = 229;

export const isComposing = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode === IME_PROCESS_KEY;

export const isComposingInput = (event: Event): boolean =>
  event instanceof InputEvent && event.isComposing;
