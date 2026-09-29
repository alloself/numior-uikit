import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import type {
  CatalogReference,
  ComponentReference,
} from '../../.vitepress/reference/reference.types';
import type { ExampleLocale } from '../../.vitepress/examples/example.types';
import ApiComponent from '../../.vitepress/theme/parts/ApiComponent.vue';
import { en, ru } from '../../.vitepress/theme/texts';

export const referenceOf = (overrides: Partial<ComponentReference> = {}): ComponentReference => ({
  name: 'NuiSample',
  package: '@numior/vue',
  family: 'sample',
  file: '/packages/vue/src/sample/NuiSample.vue',
  styles: {
    import: '@numior/vue/styles/sample.css',
    blocks: [{ name: 'nui-sample', parts: ['label'], modifiers: ['size-sm', '__label--muted'] }],
    tokens: ['--nui-primary'],
  },
  messages: undefined,
  props: [
    {
      name: 'size',
      type: 'NuiSize | undefined',
      kind: 'enum',
      required: false,
      default: '"md"',
      values: ['sm', 'md', 'lg'],
      description: { ru: 'Ступень размера.', en: 'Size step.' },
    },
    {
      name: 'items',
      type: 'readonly string[]',
      kind: 'other',
      required: true,
      default: undefined,
      values: undefined,
      description: undefined,
    },
  ],
  models: [
    {
      name: 'v-model',
      prop: 'modelValue',
      event: 'update:modelValue',
      type: 'string | null',
      default: 'null',
      description: { ru: 'Выбранное значение.', en: 'Selected value.' },
    },
  ],
  events: [{ name: 'select', type: '[value: string]', description: undefined }],
  slots: [{ name: 'default', type: '{}', description: { ru: 'Содержимое.', en: 'Content.' } }],
  exposed: [],
  keyboard: [{ keys: 'Enter', description: { ru: 'Выбирает.', en: 'Selects.' } }],
  configurator: undefined,
  ...overrides,
});

export class ApiComponentDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(
    component: ComponentReference,
    locale: ExampleLocale = 'ru',
    heading = false,
    catalog?: CatalogReference,
  ) {
    return new ApiComponentDriver(
      mount(ApiComponent, {
        props: { component, catalog, locale, texts: locale === 'en' ? en : ru, heading },
      }),
    );
  }

  get sectionTitles(): string[] {
    return this.wrapper.findAll('h4').map((title) => title.text());
  }

  get heading(): DOMWrapper<Element> {
    return this.wrapper.find('h3');
  }

  private table(title: string): DOMWrapper<Element> {
    const section = this.wrapper.findAll('h4').find((candidate) => candidate.text() === title)
      ?.element.parentElement;

    if (section === null || section === undefined) {
      throw new Error(`No section "${title}"`);
    }
    return new DOMWrapper(section);
  }

  rows(title: string): string[][] {
    return this.table(title)
      .findAll('.nui-table__body [role="row"]')
      .map((row) => row.findAll('[role="gridcell"]').map((cell) => cell.text()));
  }

  get requiredMarks(): string[] {
    return this.wrapper
      .findAll('[role="gridcell"] [title]')
      .map((mark) => mark.attributes('title') ?? '');
  }

  private styleList(label: string): string[] {
    const list = this.wrapper
      .findAll('p')
      .find((candidate) => candidate.find('span').text() === `${label}:`);

    return list === undefined ? [] : list.findAll('code').map((entry) => entry.text());
  }

  get styleClasses(): string[] {
    return this.styleList(ru.apiClasses);
  }

  get styleTokens(): string[] {
    return this.styleList(ru.apiTokens);
  }

  get styleImport(): string {
    return this.wrapper.find('.nui-code__code').text();
  }
}
