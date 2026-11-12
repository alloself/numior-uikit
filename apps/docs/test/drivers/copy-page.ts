import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import CopyPage from '../../.vitepress/theme/parts/CopyPage.vue';
import { ru } from '../../.vitepress/theme/texts';
import { installClipboard } from '../../../../packages/primitives/test/support/clipboard';

interface PageRequest {
  readonly url: string;
  readonly accept: string | null;
}

const addressOf = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

export class CopyPageDriver {
  readonly requests: PageRequest[] = [];
  private readonly clipboard = installClipboard();
  private readonly wrapper: VueWrapper;

  constructor(path: string, pages: Readonly<Record<string, string>>) {
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = addressOf(input);
      const page = pages[url];

      this.requests.push({ url, accept: new Headers(init?.headers).get('accept') });

      return Promise.resolve(
        page === undefined ? new Response('', { status: 404 }) : new Response(page),
      );
    });

    this.wrapper = mount(CopyPage, { props: { path, texts: ru }, attachTo: document.body });
  }

  get copied(): readonly string[] {
    return this.clipboard.copies;
  }

  get button(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('button');
  }

  get labels(): string[] {
    return this.wrapper
      .findAll('button')
      .map((button) => button.attributes('aria-label') ?? button.text());
  }

  async copy(): Promise<void> {
    await this.button.trigger('click');
    await flushPromises();
  }

  unmount(): void {
    this.wrapper.unmount();
    this.clipboard.restore();
  }
}
