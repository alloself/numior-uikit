export interface TrackScroll {
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly scrollLeft: number;
  readonly rtl?: boolean;
}

export interface EdgeState {
  readonly start: boolean;
  readonly end: boolean;
}

export type EdgeSide = keyof EdgeState;

export interface TrackBox {
  readonly start: number;
  readonly size: number;
}

export const stubTrackScroll = (
  element: HTMLElement,
  { scrollWidth, clientWidth, scrollLeft, rtl = false }: TrackScroll,
): void => {
  const low = rtl ? clientWidth - scrollWidth : 0;

  Object.defineProperties(element, {
    scrollWidth: { configurable: true, value: scrollWidth },
    clientWidth: { configurable: true, value: clientWidth },
    scrollBy: {
      configurable: true,
      value: ({ left = 0 }: ScrollToOptions) => {
        element.scrollLeft = Math.min(
          low + scrollWidth - clientWidth,
          Math.max(low, element.scrollLeft + left),
        );

        element.dispatchEvent(new Event('scroll'));
      },
    },
    getBoundingClientRect: {
      configurable: true,
      value: () => new DOMRect(0, 0, clientWidth, 0),
    },
  });

  element.scrollLeft = scrollLeft;
};

export const placeBox = (element: HTMLElement, { start, size }: TrackBox): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(start, 0, size, 0),
  });
};

export const dispatchWheel = (
  element: HTMLElement,
  deltaY: number,
  init: WheelEventInit = {},
): boolean => {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true, ...init });

  element.dispatchEvent(event);
  return event.defaultPrevented;
};
