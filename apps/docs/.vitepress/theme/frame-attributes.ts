import { NUMIOR_PALETTE } from './composables/use-accent';
import type { ScreenState } from './theme.types';

export type FrameAttributes = Readonly<Record<string, string | null>>;

export const screenAttributes = (state: ScreenState): FrameAttributes => ({
  'data-nui-theme': state.scheme,
  'data-nui-accent': state.accent === NUMIOR_PALETTE ? null : state.accent,
  dir: state.rtl ? 'rtl' : 'ltr',
});

export const applyAttributes = (
  target: Element | null | undefined,
  attributes: FrameAttributes,
): void => {
  if (target === undefined || target === null) {
    return;
  }
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null) {
      target.removeAttribute(name);
    } else {
      target.setAttribute(name, value);
    }
  }
};
