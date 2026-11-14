export const hasClippedText = (owner: HTMLElement, selector: string): boolean => {
  const text = owner.querySelector(selector);

  return text !== null && text.scrollWidth > text.clientWidth;
};
