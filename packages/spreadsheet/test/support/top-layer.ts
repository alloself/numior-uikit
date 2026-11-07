const toggled = (element: HTMLElement, newState: 'open' | 'closed'): void => {
  ['beforetoggle', 'toggle'].forEach((type) => {
    element.dispatchEvent(Object.assign(new Event(type), { newState }));
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
