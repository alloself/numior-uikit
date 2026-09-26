export const FOCUSABLE =
  'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])';

const labelledControl = (root: HTMLElement): Element | null => {
  const label = root.querySelector('label[for]');

  const control =
    label instanceof HTMLLabelElement ? root.ownerDocument.getElementById(label.htmlFor) : null;

  return control && root.contains(control) && control.matches(FOCUSABLE) ? control : null;
};

export const focusControl = (root: HTMLElement | null): void => {
  const target =
    root &&
    (labelledControl(root) ?? root.querySelector('input:checked') ?? root.querySelector(FOCUSABLE));

  if (target instanceof HTMLElement) {
    target.focus();
  }
};
