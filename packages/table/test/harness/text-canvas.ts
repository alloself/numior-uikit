export interface TextCanvas {
  restore(): void;
}

interface FakeContext {
  font: string;
  measureText(text: string): { width: number };
}

export const CHAR_WIDTH = 7;

export const BOLD_CHAR_WIDTH = 8;

const createContext = (): FakeContext => {
  const context: FakeContext = {
    font: '',
    measureText: (text) => ({
      width: text.length * (context.font.includes(' 700 ') ? BOLD_CHAR_WIDTH : CHAR_WIDTH),
    }),
  };

  return context;
};

class FakeCanvas {
  getContext = (): FakeContext => createContext();
}

export const installTextCanvas = (): TextCanvas => {
  const before = Reflect.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');

  Reflect.defineProperty(globalThis, 'OffscreenCanvas', {
    configurable: true,
    writable: true,
    value: FakeCanvas,
  });

  return {
    restore: () => {
      if (before === undefined) {
        Reflect.deleteProperty(globalThis, 'OffscreenCanvas');
        return;
      }

      Reflect.defineProperty(globalThis, 'OffscreenCanvas', before);
    },
  };
};
