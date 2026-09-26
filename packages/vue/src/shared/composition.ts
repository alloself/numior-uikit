const IME_PROCESS_KEY = 229;

export const isComposing = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode === IME_PROCESS_KEY;
