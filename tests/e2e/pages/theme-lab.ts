import type { Page } from '@playwright/test';
import { kitCss } from '../../tailwind/drivers/kit-build';

export type Scheme = 'light' | 'dark';

export type SchemeScope = Scheme | 'system';

export interface SchemeCase {
  readonly scopes: readonly SchemeScope[];
  readonly own: SchemeScope | null;
}

export interface SchemeProbe {
  readonly name: string;
  readonly variant: Scheme;
  readonly native: Scheme;
}

export interface ThemeLabOptions {
  readonly root?: SchemeScope | null;
  readonly device?: Scheme;
  readonly css?: string;
}

const PROBE = 'scheme-probe';
const ACCENTS = "@import '@numior/tokens/accents.css' layer(theme);";
const SCHEME_CLASSES = ['bg-white', 'dark:bg-black'];
const NATIVE = `.${PROBE} { color: light-dark(rgb(255, 255, 255), rgb(0, 0, 0)); }`;

const scopeClass = (scope: SchemeScope | null | undefined): string =>
  scope === null || scope === undefined ? '' : `nui-theme--${scope}`;

export const schemeCaseName = ({ scopes, own }: SchemeCase): string =>
  `${scopes.length > 0 ? scopes.join(' > ') : 'page'} / own ${own ?? 'none'}`;

const probeMarkup = (item: SchemeCase): string => {
  const classes = [PROBE, ...SCHEME_CLASSES, scopeClass(item.own)].join(' ').trim();
  const probe = `<p class="${classes}" aria-label="${schemeCaseName(item)}">x</p>`;

  return item.scopes.reduceRight(
    (inner, scope) => `<div class="${scopeClass(scope)}">${inner}</div>`,
    probe,
  );
};

const classesIn = (markup: string): string[] =>
  Array.from(markup.matchAll(/class="([^"]*)"/g), ([, list = '']) => list.split(/\s+/)).flat();

export class ThemeLab {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(
    markup: string,
    { root = null, device = 'light', css = '' }: ThemeLabOptions = {},
  ): Promise<void> {
    const kit = await kitCss({ theme: ACCENTS, classes: classesIn(markup) });

    await this.page.emulateMedia({ colorScheme: device });

    await this.page.setContent(
      `<!doctype html><html class="${scopeClass(root)}"><head><style>${kit}${css}</style></head><body>${markup}</body></html>`,
    );
  }

  openSchemes(cases: readonly SchemeCase[], options: ThemeLabOptions): Promise<void> {
    return this.open(cases.map(probeMarkup).join(''), { ...options, css: NATIVE });
  }

  schemeProbes(): Promise<SchemeProbe[]> {
    return this.page.locator(`.${PROBE}`).evaluateAll((elements) =>
      elements.map((element): SchemeProbe => {
        const style = getComputedStyle(element);

        return {
          name: element.getAttribute('aria-label') ?? '',
          variant: style.backgroundColor === 'rgb(0, 0, 0)' ? 'dark' : 'light',
          native: style.color === 'rgb(0, 0, 0)' ? 'dark' : 'light',
        };
      }),
    );
  }

  styleOf(label: string, property: string): Promise<string> {
    return this.page
      .getByLabel(label, { exact: true })
      .evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
  }
}
