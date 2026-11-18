import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { nextTick } from 'vue';
import type { TokenReference } from '../../.vitepress/reference/reference.types';
import TokenTable from '../../.vitepress/theme/parts/TokenTable.vue';
import { ru } from '../../.vitepress/theme/texts';
import type { TokenSection } from '../../.vitepress/theme/theme.types';
import { tokenRowsOf } from '../../.vitepress/theme/token-sections';

const SCHEME_CLASS = 'nui-theme--';

const narrowList = (): Pick<
  MediaQueryList,
  'matches' | 'addEventListener' | 'removeEventListener'
> => ({
  matches: true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

export const themeToken = (name: string, light: string, dark?: string): TokenReference => ({
  name: `--${name}`,
  group: name.split('-')[0] ?? name,
  light,
  dark,
});

export class TokenTableDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static async mountNarrow(
    tokens: readonly TokenReference[],
    section: TokenSection,
  ): Promise<TokenTableDriver> {
    vi.stubGlobal('matchMedia', narrowList);

    const table = TokenTableDriver.mount(tokens, section);

    await nextTick();

    return table;
  }

  static mount(tokens: readonly TokenReference[], section: TokenSection): TokenTableDriver {
    return new TokenTableDriver(
      mount(TokenTable, {
        props: { rows: tokenRowsOf(tokens, section), texts: ru },
        attachTo: document.body,
      }),
    );
  }

  get headers(): string[] {
    return this.wrapper.findAll('[role="columnheader"]').map((header) => header.text());
  }

  get rows(): string[][] {
    return this.wrapper
      .findAll('.nui-table__body [role="row"]')
      .map((row) => row.findAll('[role="gridcell"]').map((cell) => cell.text()));
  }

  private sampleCell(name: string): DOMWrapper<Element> {
    const row = this.wrapper
      .findAll('.nui-table__body [role="row"]')
      .find((candidate) => candidate.find('code').text() === `--${name}`);

    const cell = row?.find('[role="gridcell"]');

    if (cell === undefined) {
      throw new Error(`No token "${name}" in the table`);
    }
    return cell;
  }

  swatchSchemes(name: string): string[] {
    return this.sampleCell(name)
      .findAll('[class*="nui-theme--"]')
      .flatMap((swatch) => swatch.classes().filter((value) => value.startsWith(SCHEME_CLASS)))
      .map((value) => value.slice(SCHEME_CLASS.length));
  }

  sampleStyle(name: string): string {
    return this.sampleCell(name).findAll('[style]').at(0)?.attributes('style') ?? '';
  }

  unmount(): void {
    this.wrapper.unmount();
    vi.unstubAllGlobals();
  }
}
