const toggleEvent = (newState: 'open' | 'closed') =>
  Object.assign(new Event('beforetoggle'), { newState });

export const dismissPopoverNatively = (element: HTMLElement): boolean =>
  element.dispatchEvent(toggleEvent('closed'));

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
        this.dispatchEvent(toggleEvent('open'));
      },
    });
    this.define(HTMLElement.prototype, 'hidePopover', {
      value(this: HTMLElement) {
        popoverCalls.hide += 1;
        this.dispatchEvent(toggleEvent('closed'));
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

  private define(target: object, key: string, descriptor: PropertyDescriptor): void {
    Object.defineProperty(target, key, { configurable: true, ...descriptor });
    this.restorers.push(() => Reflect.deleteProperty(target, key));
  }

  restore(): void {
    for (const restore of this.restorers) {
      restore();
    }
  }
}
