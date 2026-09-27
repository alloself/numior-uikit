export const destinationAttrs = (
  href: string | undefined,
  to: unknown,
): Record<string, unknown> => {
  if (to !== undefined) {
    return { to };
  }
  return href === undefined ? {} : { href };
};
