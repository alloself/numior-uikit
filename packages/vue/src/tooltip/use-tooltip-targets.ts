import { shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref, type ShallowRef } from 'vue';
import { PointerType, type DelayedOpen } from '@numior/primitives';

export interface TooltipTargetsOptions {
  readonly selector: () => string | undefined;
  readonly root: Readonly<Ref<HTMLElement | null | undefined>>;
  readonly open: Readonly<Ref<boolean>>;
  readonly disabled: () => boolean;
  readonly accepts: (target: HTMLElement) => boolean;
  readonly delay: DelayedOpen;
  readonly describedBy: MaybeRefOrGetter<string>;
  readonly pressedRecently: () => boolean;
  readonly onPress: () => void;
}

export interface TooltipTargets {
  readonly target: Readonly<ShallowRef<HTMLElement | null>>;
  onPointerover(event: PointerEvent): void;
  onPointerout(event: PointerEvent): void;
  onFocusin(event: FocusEvent): void;
  onFocusout(event: FocusEvent): void;
  onPointerdown(): void;
}

const DESCRIBED_BY = 'aria-describedby';

const tokensOf = (element: HTMLElement): string[] =>
  (element.getAttribute(DESCRIBED_BY) ?? '').split(/\s+/).filter((token) => token !== '');

const describe = (element: HTMLElement, id: string): void => {
  const tokens = tokensOf(element);

  if (tokens.includes(id)) {
    return;
  }

  element.setAttribute(DESCRIBED_BY, [...tokens, id].join(' '));
};

const undescribe = (element: HTMLElement, id: string): void => {
  const tokens = tokensOf(element).filter((token) => token !== id);

  if (tokens.length === 0) {
    element.removeAttribute(DESCRIBED_BY);
  } else {
    element.setAttribute(DESCRIBED_BY, tokens.join(' '));
  }
};

export const useTooltipTargets = (options: TooltipTargetsOptions): TooltipTargets => {
  const target = shallowRef<HTMLElement | null>(null);
  let hovered: HTMLElement | null = null;

  const targetOf = (node: EventTarget | null): HTMLElement | null => {
    const selector = options.selector();
    const found = selector !== undefined && node instanceof Element ? node.closest(selector) : null;

    return found instanceof HTMLElement && options.root.value?.contains(found) === true
      ? found
      : null;
  };

  const take = (next: HTMLElement | null): void => {
    const id = toValue(options.describedBy);
    const previous = target.value;

    if (previous === next) {
      return;
    }
    if (previous !== null) {
      undescribe(previous, id);
    }
    if (next !== null) {
      describe(next, id);
    }
    target.value = next;
  };

  watch(options.disabled, (disabled) => {
    if (!disabled) {
      return;
    }

    take(null);
  });

  return {
    target,
    onPointerover: (event) => {
      const next = targetOf(event.target);

      if (
        event.pointerType === PointerType.Touch ||
        options.disabled() ||
        next === null ||
        next === hovered
      ) {
        return;
      }
      hovered = next;
      if (!options.accepts(next)) {
        options.delay.closeNow();
        return;
      }
      take(next);
      if (options.open.value) {
        options.delay.openNow();
      } else {
        options.delay.scheduleOpen();
      }
    },
    onPointerout: (event) => {
      if (targetOf(event.target) === null || targetOf(event.relatedTarget) !== null) {
        return;
      }

      hovered = null;
      options.delay.scheduleClose();
    },
    onFocusin: (event) => {
      const next = targetOf(event.target);

      if (next === null || options.disabled() || options.pressedRecently()) {
        return;
      }
      if (!options.accepts(next)) {
        options.delay.closeNow();
        return;
      }

      take(next);
      options.delay.openNow();
    },
    onFocusout: (event) => {
      if (targetOf(event.relatedTarget) !== null) {
        return;
      }

      options.delay.closeNow();
    },
    onPointerdown: () => {
      options.onPress();
      options.delay.closeNow();
    },
  };
};
