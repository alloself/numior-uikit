import { useEventListener } from '@vueuse/core';
import { watch, type Ref } from 'vue';

const viewportOf = (element: HTMLElement | null): VisualViewport | null | undefined =>
  element?.ownerDocument.defaultView?.visualViewport;

export const useKeyboardInset = (
  element: Readonly<Ref<HTMLElement | null>>,
  enabled: () => boolean,
): void => {
  const place = (): void => {
    const target = element.value;

    if (!enabled()) {
      target?.style.removeProperty('--_keyboard');
      return;
    }

    const view = target?.ownerDocument.defaultView;
    const viewport = viewportOf(target);

    if (
      target === null ||
      view === null ||
      view === undefined ||
      viewport === null ||
      viewport === undefined
    ) {
      return;
    }
    const inset = Math.max(0, view.innerHeight - viewport.height - viewport.offsetTop);

    target.style.setProperty('--_keyboard', `${String(inset)}px`);
  };

  useEventListener(
    () => (enabled() ? viewportOf(element.value) : undefined),
    ['resize', 'scroll'],
    place,
  );

  watch([element, enabled], place, { flush: 'post', immediate: true });
};
