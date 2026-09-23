const siblingOf = (element: Element): Element | null =>
  element.nextElementSibling ?? element.previousElementSibling;

const toastIn = (element: Element | null): HTMLElement | null => {
  if (element === null) {
    return null;
  }
  const toast = element.matches('.nui-toast') ? element : element.querySelector('.nui-toast');
  return toast instanceof HTMLElement ? toast : null;
};

export const focusNeighbour = (element: HTMLElement): void => {
  const parent = element.parentElement;
  const neighbour =
    toastIn(siblingOf(element)) ?? (parent === null ? null : toastIn(siblingOf(parent)));
  neighbour?.focus();
};
