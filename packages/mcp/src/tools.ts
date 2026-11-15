import { camelCase, upperFirst } from 'lodash-es';
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { checkUsage } from './check/check-usage';
import type { McpComponent, McpData, McpFile, McpLocale, McpText } from './data.types';
import { nearest } from './nearest';
import { findPage } from './pages';
import { toolMessages } from './tools.messages';
import type { PageSearch } from './tools.types';

const KIT_PREFIX = /^Nui(?=[A-Z])/u;
const FAMILY_SEPARATOR = '/';
const EXTENSION = /\.([\w-]+)$/u;
const TICKS = /`+/gu;
const MIN_FENCE = 3;
const MAX_SUGGESTIONS = 12;

const textContent = (text: string): TextContent => ({ type: 'text', text });

const answer = (...texts: readonly string[]): CallToolResult => ({
  content: texts.map(textContent),
});

const failure = (text: string): CallToolResult => ({ content: [textContent(text)], isError: true });

const json = (value: unknown): string => JSON.stringify(value);

const localized = (text: McpText | undefined, locale: McpLocale): string | undefined =>
  text?.[locale];

const componentKey = (name: string): string => {
  const pascal = upperFirst(camelCase(name.trim()));

  return KIT_PREFIX.test(pascal) ? pascal : `Nui${pascal}`;
};

const pageDescription = (
  data: McpData,
  component: McpComponent,
  locale: McpLocale,
): string | undefined => {
  const path = component.pages[0];

  return data.pages[locale].find((page) => page.path === path)?.description;
};

export const listComponents = (
  data: McpData,
  pkg: string | undefined,
  locale: McpLocale,
): CallToolResult => {
  const components = Object.values(data.components).flatMap((component) =>
    pkg === undefined || component.package === pkg
      ? [
          {
            name: component.name,
            package: component.package,
            page: component.pages[0],
            description: pageDescription(data, component, locale),
          },
        ]
      : [],
  );

  if (pkg !== undefined && components.length === 0) {
    const packages = [...new Set(Object.values(data.components).map((item) => item.package))];

    return failure(toolMessages[locale].unknownPackage(pkg, packages));
  }
  return answer(json(components));
};

const componentView = (data: McpData, component: McpComponent, locale: McpLocale) => ({
  name: component.name,
  package: component.package,
  import: `import { ${component.name} } from '${component.package}';`,
  stylesheets: component.stylesheets,
  props: component.props.map((prop) => ({
    name: prop.name,
    type: prop.type,
    required: prop.required,
    default: prop.default,
    values: prop.values,
    description: localized(prop.description, locale),
  })),
  models: component.models.map((model) => ({
    name: model.name,
    prop: model.prop,
    event: model.event,
    type: model.type,
    default: model.default,
    description: localized(model.description, locale),
  })),
  events: component.events.map((event) => ({
    name: event.name,
    payload: event.type,
    description: localized(event.description, locale),
  })),
  slots: component.slots.map((slot) => ({
    name: slot.name,
    props: slot.type,
    description: localized(slot.description, locale),
  })),
  exposed: component.exposed.map((member) => ({
    name: member.name,
    type: member.type,
    description: localized(member.description, locale),
  })),
  keyboard: component.keyboard.map((key) => ({
    keys: key.keys,
    action: key.description[locale],
  })),
  texts:
    component.messages === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(data.catalogs[component.messages] ?? {}).map(([key, text]) => [
            key,
            text[locale],
          ]),
        ),
  tokens: component.styles?.tokens,
  pages: component.pages,
});

export const getComponent = (data: McpData, name: string, locale: McpLocale): CallToolResult => {
  const key = componentKey(name);
  const component = data.components[key];

  if (component === undefined) {
    return failure(
      toolMessages[locale].unknownComponent(name, nearest(key, Object.keys(data.components))),
    );
  }

  const page =
    component.pages[0] === undefined ? undefined : findPage(data, locale, component.pages[0]);

  const view = json(componentView(data, component, locale));

  return page === undefined ? answer(view) : answer(view, page.markdown);
};

const fenceFor = (source: string): string =>
  '`'.repeat(
    Math.max(
      MIN_FENCE,
      (source.match(TICKS) ?? []).reduce((longest, run) => Math.max(longest, run.length + 1), 0),
    ),
  );

const fileBlock = (file: McpFile): string => {
  const fence = fenceFor(file.source);

  return `\`${file.name}\`\n\n${fence}${EXTENSION.exec(file.name)?.[1] ?? ''}\n${file.source.trimEnd()}\n${fence}\n`;
};

const exampleSuggestions = (names: readonly string[], name: string): string[] => {
  const family = `${name.split(FAMILY_SEPARATOR)[0] ?? ''}${FAMILY_SEPARATOR}`;

  const related = names.reduce<string[]>((found, candidate) => {
    if (found.length < MAX_SUGGESTIONS && candidate.startsWith(family)) {
      found.push(candidate);
    }
    return found;
  }, []);

  const close = nearest(name, names);

  return related.length > 0 || close === undefined ? related : [close];
};

export const getExample = (data: McpData, name: string, locale: McpLocale): CallToolResult => {
  const examples = data.examples[locale];
  const files = examples[name.trim()];

  if (files === undefined) {
    return failure(
      toolMessages[locale].unknownExample(name, exampleSuggestions(Object.keys(examples), name)),
    );
  }
  return answer(files.map(fileBlock).join('\n'));
};

export const getPage = (data: McpData, address: string, locale: McpLocale): CallToolResult => {
  const page = findPage(data, locale, address);

  if (page === undefined) {
    const paths = data.pages[locale].map((candidate) => candidate.path);

    return failure(toolMessages[locale].unknownPage(address, nearest(address, paths)));
  }
  return answer(page.markdown);
};

export const searchPages = (
  search: PageSearch,
  query: string,
  locale: McpLocale,
  limit: number,
): CallToolResult => answer(json(search(query, locale, limit)));

export const listTokens = (data: McpData, group: string | undefined): CallToolResult => {
  const wanted = group?.trim().toLowerCase();
  const tokens = data.tokens.filter((token) => wanted === undefined || token.group === wanted);

  if (wanted !== undefined && tokens.length === 0) {
    const groups = [...new Set(data.tokens.map((token) => token.group))];

    return failure(toolMessages.en.unknownGroup(wanted, groups));
  }
  return answer(json(tokens));
};

export const listIcons = (data: McpData, query: string | undefined): CallToolResult => {
  const wanted = query?.trim().toLowerCase() ?? '';

  return answer(
    json(data.icons.filter((icon) => icon.alias.includes(wanted) || icon.icon.includes(wanted))),
  );
};

export const checkCode = (
  data: McpData,
  code: string,
  filename: string | undefined,
  locale: McpLocale,
): CallToolResult => answer(json(checkUsage(data, { code, filename, locale })));
