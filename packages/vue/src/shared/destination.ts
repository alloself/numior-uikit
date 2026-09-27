export interface NuiRouteRegister {}

export type NuiRouteLocation = NuiRouteRegister extends { readonly location: infer Location }
  ? Location
  : string | object;

export const destinationAttrs = (
  href: string | undefined,
  to: NuiRouteLocation | undefined,
): Record<string, unknown> => {
  if (to !== undefined) {
    return { to };
  }
  return href === undefined ? {} : { href };
};
