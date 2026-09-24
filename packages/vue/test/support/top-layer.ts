const toggleEvent = (type: 'beforetoggle' | 'toggle', newState: 'open' | 'closed') =>
  Object.assign(new Event(type), { newState });

const announce = (element: HTMLElement, newState: 'open' | 'closed'): boolean => {
  element.dispatchEvent(toggleEvent('beforetoggle', newState));
  return element.dispatchEvent(toggleEvent('toggle', newState));
};

export const dismissPopoverNatively = (element: HTMLElement): boolean =>
  announce(element, 'closed');

export class TopLayerStubs {
  readonly showModalCalls: { count: number };
  readonly closedWith: string[];
  readonly popoverCalls: { show: number; hide: number };
  private readonly restorers: Array<() => void> = [];

  constructor() {
    const showModalCalls = { count: 0 };
    const closedWith: string[] = [];
    const popoverCalls = { show: 0, hide: 0 };
    this.showModalCalls = showModalCalls;
    this.closedWith = closedWith;
    this.popoverCalls = popoverCalls;
    this.define(HTMLElement.prototype, 'showPopover', {
      value(this: HTMLElement) {
        popoverCalls.show += 1;
        announce(this, 'open');
      },
    });
    this.define(HTMLElement.prototype, 'hidePopover', {
      value(this: HTMLElement) {
        popoverCalls.hide += 1;
        announce(this, 'closed');
      },
    });
    this.define(HTMLDialogElement.prototype, 'open', {
      get(this: HTMLDialogElement) {
        return this.hasAttribute('open');
      },
    });
    this.define(HTMLDialogElement.prototype, 'returnValue', { writable: true, value: '' });
    this.define(HTMLDialogElement.prototype, 'showModal', {
      value(this: HTMLDialogElement) {
        showModalCalls.count += 1;
        this.setAttribute('open', '');
      },
    });
    this.define(HTMLDialogElement.prototype, 'close', {
      value(this: HTMLDialogElement, value = '') {
        closedWith.push(value);
        this.returnValue = value;
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
  }

  define(target: object, key: string, descriptor: PropertyDescriptor): void {
    Object.defineProperty(target, key, { configurable: true, ...descriptor });
    this.restorers.push(() => Reflect.deleteProperty(target, key));
  }

  restore(): void {
    for (const restore of this.restorers) {
      restore();
    }
  }
}
