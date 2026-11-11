import type { ExampleLocale } from '../examples/example.types.ts';
import type {
  ComponentReference,
  DeclarationReference,
  IconReference,
  LocalizedText,
  ReferenceBundle,
  ReferenceKey,
  TokenReference,
} from '../reference/reference.types.ts';
import type { DocsTexts } from '../theme/theme.types.ts';

type Row = readonly string[];

const cell = (text: string): string => text.replaceAll(/\s+/g, ' ').replaceAll('|', '\\|').trim();

const code = (text: string | undefined): string =>
  text === undefined || text === '' ? '' : `\`${text.replaceAll(/\s+/g, ' ').trim()}\``;

const textOf = (description: LocalizedText | undefined, locale: ExampleLocale): string =>
  description?.[locale] ?? '';

export const tableOf = (head: Row, rows: readonly Row[]): string[] =>
  rows.length === 0
    ? []
    : [
        `| ${head.map(cell).join(' | ')} |`,
        `| ${head.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
        '',
      ];

const sectionOf = (title: string, head: Row, rows: readonly Row[]): string[] =>
  rows.length === 0 ? [] : [`#### ${title}`, '', ...tableOf(head, rows)];

const importOf = (component: ComponentReference): string[] => [
  '```ts',
  `import { ${component.name} } from '${component.package}';`,
  ...(component.styles === undefined ? [] : [`import '${component.styles.import}';`]),
  '```',
  '',
];

const catalogRows = (
  bundle: ReferenceBundle,
  component: ComponentReference,
  locale: ExampleLocale,
): Row[] =>
  component.messages === undefined
    ? []
    : Object.entries(bundle.catalogs[component.messages]?.texts ?? {}).map(([key, text]) => [
        code(key),
        text[locale],
      ]);

export const componentApi = (
  bundle: ReferenceBundle,
  component: ComponentReference,
  locale: ExampleLocale,
  texts: DocsTexts,
): string[] => [
  `### ${component.name}`,
  '',
  ...importOf(component),
  ...sectionOf(
    texts.apiProps,
    [texts.apiName, texts.apiType, texts.apiDefault, texts.apiDescription],
    component.props.map((prop) => [
      prop.required ? `${code(prop.name)} (${texts.apiRequired})` : code(prop.name),
      code(prop.type),
      code(prop.default),
      textOf(prop.description, locale),
    ]),
  ),
  ...sectionOf(
    texts.apiModels,
    [texts.apiName, texts.apiType, texts.apiDefault, texts.apiDescription],
    component.models.map((model) => [
      code(model.name),
      code(model.type),
      code(model.default),
      textOf(model.description, locale),
    ]),
  ),
  ...sectionOf(
    texts.apiEvents,
    [texts.apiName, texts.apiPayload, texts.apiDescription],
    component.events.map((event) => [
      code(event.name),
      code(event.type),
      textOf(event.description, locale),
    ]),
  ),
  ...sectionOf(
    texts.apiSlots,
    [texts.apiName, texts.apiSlotProps, texts.apiDescription],
    component.slots.map((slot) => [
      code(slot.name),
      code(slot.type),
      textOf(slot.description, locale),
    ]),
  ),
  ...sectionOf(
    texts.apiExposed,
    [texts.apiName, texts.apiType, texts.apiDescription],
    component.exposed.map((member) => [
      code(member.name),
      code(member.type),
      textOf(member.description, locale),
    ]),
  ),
  ...sectionOf(
    texts.apiTexts,
    [texts.apiKey, texts.apiText],
    catalogRows(bundle, component, locale),
  ),
];

export const keyboardTable = (
  keys: readonly ReferenceKey[],
  locale: ExampleLocale,
  texts: DocsTexts,
): string[] =>
  tableOf(
    [texts.apiKeys, texts.apiAction],
    keys.map((key) => [code(key.keys), key.description[locale]]),
  );

export const signatureBlock = (declaration: DeclarationReference): string[] => [
  '```ts',
  `import ${declaration.kind === 'type' ? 'type ' : ''}{ ${declaration.name} } from '${declaration.package}';`,
  '',
  declaration.signature,
  '```',
  '',
];

export const tokenTable = (tokens: readonly TokenReference[], texts: DocsTexts): string[] =>
  tableOf(
    [texts.tokenName, texts.tokenValue, texts.tokenDark],
    tokens.map((token) => [code(token.name), code(token.light), code(token.dark)]),
  );

export const iconTable = (icons: readonly IconReference[], texts: DocsTexts): string[] =>
  tableOf(
    [texts.iconName, texts.iconLucide],
    icons.map((icon) => [code(icon.alias), code(icon.icon)]),
  );
