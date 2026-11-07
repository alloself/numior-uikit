const toggled = (element: HTMLElement, newState: 'open' | 'closed'): void => {
  element.dispatchEvent(Object.assign(new Event('beforetoggle'), { newState }));

  queueMicrotask(() => {
    element.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
  });
};

export const stubPopovers = (): (() => void) => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value(this: HTMLElement) {
      toggled(this, 'open');
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
    configurable: true,
    value(this: HTMLElement) {
      toggled(this, 'closed');
    },
  });

  return () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
  };
};
