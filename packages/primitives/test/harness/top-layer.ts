export interface TopLayerLog {
  readonly showPopover: number;
  readonly hidePopover: number;
  readonly showModal: number;
  readonly close: string[];
}

const toggleEvent = (type: 'beforetoggle' | 'toggle', newState: 'open' | 'closed') =>
  Object.assign(new Event(type), { newState });

const announce = (element: HTMLElement, newState: 'open' | 'closed'): boolean => {
  element.dispatchEvent(toggleEvent('beforetoggle', newState));
  return element.dispatchEvent(toggleEvent('toggle', newState));
};

export const installTopLayer = (): { readonly log: TopLayerLog; restore(): void } => {
  const log = { showPopover: 0, hidePopover: 0, showModal: 0, close: new Array<string>() };
  const defined: Array<[object, string]> = [];
  const define = (target: object, key: string, descriptor: PropertyDescriptor): void => {
    Object.defineProperty(target, key, { configurable: true, ...descriptor });
    defined.push([target, key]);
  };
  define(HTMLElement.prototype, 'showPopover', {
    value(this: HTMLElement) {
      log.showPopover += 1;
      announce(this, 'open');
    },
  });
  define(HTMLElement.prototype, 'hidePopover', {
    value(this: HTMLElement) {
      log.hidePopover += 1;
      announce(this, 'closed');
    },
  });
  define(HTMLDialogElement.prototype, 'open', {
    get(this: HTMLDialogElement) {
      return this.hasAttribute('open');
    },
  });
  define(HTMLDialogElement.prototype, 'returnValue', { writable: true, value: '' });
  define(HTMLDialogElement.prototype, 'showModal', {
    value(this: HTMLDialogElement) {
      log.showModal += 1;
      this.setAttribute('open', '');
    },
  });
  define(HTMLDialogElement.prototype, 'close', {
    value(this: HTMLDialogElement, value = '') {
      log.close.push(value);
      this.returnValue = value;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
  return {
    log,
    restore: () => {
      for (const [target, key] of defined) {
        Reflect.deleteProperty(target, key);
      }
    },
  };
};

export const dismissNatively = (element: HTMLElement): boolean => announce(element, 'closed');
