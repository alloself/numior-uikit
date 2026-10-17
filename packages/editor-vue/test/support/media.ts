const listOf = (media: string, matches: boolean): MediaQueryList => {
  const list: MediaQueryList = {
    media,
    matches,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  };

  return list;
};

export const installTouch = (): (() => void) => {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => listOf(query, query.includes('coarse')),
  });

  return () => {
    if (original === undefined) {
      Reflect.deleteProperty(window, 'matchMedia');
    } else {
      Object.defineProperty(window, 'matchMedia', original);
    }
  };
};
