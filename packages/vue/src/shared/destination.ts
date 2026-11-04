import { useConfiguredLink, type NuiLinkComponent } from '@numior/primitives';
import { computed, getCurrentInstance, type ComputedRef } from 'vue';
import { HtmlTag } from './tag.types';

export interface NuiRouteRegister {}

export type NuiRouteLocation = NuiRouteRegister extends { readonly location: infer Location }
  ? Location
  : string | object;

export interface NuiLinkSource {
  readonly as?: NuiLinkComponent | undefined;
  readonly to?: NuiRouteLocation | undefined;
}

const registeredLink = (): NuiLinkComponent | undefined => {
  const components = getCurrentInstance()?.appContext.components;

  return components?.NuxtLink ?? components?.RouterLink;
};

export const useLinkTag = (
  source: () => NuiLinkSource,
  fallback: NuiLinkComponent = 'a',
): ComputedRef<NuiLinkComponent> => {
  const configured = useConfiguredLink();
  const registered = registeredLink();

  return computed(() => {
    const { as, to } = source();

    if (as !== undefined) {
      return as;
    }
    if (to !== undefined) {
      return configured ?? registered ?? fallback;
    }
    return fallback;
  });
};

export const destinationAttrs = (
  href: string | undefined,
  to: NuiRouteLocation | undefined,
  tag: NuiLinkComponent,
): Record<string, unknown> => {
  if (to === undefined) {
    return href === undefined ? {} : { href };
  }
  if (tag !== HtmlTag.Anchor) {
    return { to };
  }
  return typeof to === 'string' ? { href: to } : {};
};
