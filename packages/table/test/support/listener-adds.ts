import { vi } from 'vite-plus/test';

export interface ListenerAdds {
  readonly types: () => string[];
  readonly restore: () => void;
}

const COSTLY = /^(?:pointer|touch|wheel)/u;

export const watchPointerListenerAdds = (): ListenerAdds => {
  const spy = vi.spyOn(EventTarget.prototype, 'addEventListener');

  return {
    types: () => {
      const found: string[] = [];

      for (const [type] of spy.mock.calls) {
        if (!COSTLY.test(type)) {
          continue;
        }
        found.push(type);
      }

      return found;
    },
    restore: () => {
      spy.mockRestore();
    },
  };
};
