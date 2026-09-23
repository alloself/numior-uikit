export const focusNeighbour = (element: HTMLElement): void => {
  const neighbour = element.nextElementSibling ?? element.previousElementSibling;
  if (neighbour instanceof HTMLElement) {
    neighbour.focus();
  }
};
