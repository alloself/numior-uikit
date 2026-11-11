export const mirrorAttributes = (
  source: Element,
  target: Element | null | undefined,
  names: readonly string[],
): void => {
  if (target === undefined || target === null) {
    return;
  }
  for (const name of names) {
    const value = source.getAttribute(name);

    if (value === null) {
      target.removeAttribute(name);
    } else {
      target.setAttribute(name, value);
    }
  }
};
