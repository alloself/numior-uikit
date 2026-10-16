import { vi } from 'vite-plus/test';

type ClipboardPart = string | Blob;

class FakeClipboardItem {
  constructor(readonly parts: Readonly<Record<string, ClipboardPart>>) {}
}

export interface ClipboardStub {
  readonly copies: string[];
  readonly htmls: string[];
  readonly writes: number;
  readonly commands: number;
  restore(): void;
}

export interface ClipboardStubOptions {
  readonly api?: 'granted' | 'refused' | 'missing';
  readonly legacy?: boolean | 'refused';
}

const textOf = (part: ClipboardPart): Promise<string> =>
  typeof part === 'string' ? Promise.resolve(part) : part.text();

const grantedStatus = (): PermissionStatus =>
  Object.assign(new EventTarget(), {
    state: 'granted' as const,
    name: 'clipboard-write',
    onchange: null,
  });

export const installClipboard = ({
  api = 'missing',
  legacy = true,
}: ClipboardStubOptions = {}): ClipboardStub => {
  const copies: string[] = [];
  const htmls: string[] = [];
  const counters = { writes: 0, commands: 0 };

  const write = async (items: readonly FakeClipboardItem[]): Promise<void> => {
    counters.writes += 1;
    if (api === 'refused') {
      throw new Error('denied');
    }
    for (const item of items) {
      const text = item.parts['text/plain'];
      const html = item.parts['text/html'];

      if (text !== undefined) {
        copies.push(await textOf(text));
      }
      if (html !== undefined) {
        htmls.push(await textOf(html));
      }
    }
  };

  const writeText = (text: string): Promise<void> => {
    counters.writes += 1;
    if (api === 'refused') {
      return Promise.reject(new Error('denied'));
    }
    copies.push(text);
    return Promise.resolve();
  };

  const execCommand = (command: string): boolean => {
    counters.commands += 1;
    if (legacy === false) {
      throw new Error('unsupported');
    }
    if (legacy === 'refused') {
      return false;
    }
    if (command === 'copy') {
      const source = [...document.body.querySelectorAll('textarea')].findLast(
        (area) => area.style.opacity === '0',
      );

      if (source !== undefined) {
        copies.push(source.value);
      }
    }
    return true;
  };

  vi.stubGlobal('ClipboardItem', FakeClipboardItem);

  if (api !== 'missing') {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText },
    });

    Object.defineProperty(window.navigator, 'permissions', {
      configurable: true,
      value: { query: (): Promise<PermissionStatus> => Promise.resolve(grantedStatus()) },
    });
  }
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

  return {
    copies,
    htmls,
    get writes() {
      return counters.writes;
    },
    get commands() {
      return counters.commands;
    },
    restore: () => {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(window.navigator, 'clipboard');
      Reflect.deleteProperty(window.navigator, 'permissions');
      Reflect.deleteProperty(document, 'execCommand');
    },
  };
};
