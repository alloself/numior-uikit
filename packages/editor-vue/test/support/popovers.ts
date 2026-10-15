const shown = new WeakSet<HTMLElement>();

const announce = (element: HTMLElement, newState: 'open' | 'closed'): void => {
  for (const type of ['beforetoggle', 'toggle']) {
    const event = new Event(type);

    Object.defineProperty(event, 'newState', { value: newState });
    element.dispatchEvent(event);
  }
};

const noRects = (): DOMRectList => document.createElement('div').getClientRects();

const noRect = (): DOMRect => new DOMRect();

const showPopover = function (this: HTMLElement): void {
  shown.add(this);
  announce(this, 'open');
};

const hidePopover = function (this: HTMLElement): void {
  shown.delete(this);
  announce(this, 'closed');
};

export const installPopovers = (): void => {
  Range.prototype.getClientRects = noRects;
  Range.prototype.getBoundingClientRect = noRect;
  HTMLElement.prototype.showPopover = showPopover;
  HTMLElement.prototype.hidePopover = hidePopover;
};

export const isShown = (element: Element | null): boolean =>
  element instanceof HTMLElement && shown.has(element);
