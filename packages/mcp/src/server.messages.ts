export const SERVER_INSTRUCTIONS =
  'Numior UI documentation for Vue 3.5+: component reference, Markdown copies of the docs pages in English and Russian, example sources, theme tokens and icon aliases. Call check_usage on a Vue SFC after writing it.';

export const TOOL_DESCRIPTIONS = {
  listComponents: 'List Numior UI components with their package, docs page and short description.',
  getComponent:
    'Get the API reference of one component (props, models, events, slots, keyboard) and the Markdown copy of its docs page.',
  getExample:
    'Get the source files of a docs example by name, such as select/Basic, ready to copy.',
  getPage: 'Get the Markdown copy of a docs page by its address, such as /components/button.',
  search: 'Search the docs pages by words in titles, descriptions and text; results are ranked.',
  listTokens: 'List theme tokens (CSS custom properties) with light and dark values.',
  listIcons: 'List icon aliases the kit resolves and the Lucide icons behind them.',
  checkUsage:
    'Check a Vue SFC for Numior UI mistakes: unknown components, props, events, enumeration values and imports, kit CSS imported from a script or a <style> block, kit styles overridden from outside.',
} as const;

export const PARAM_DESCRIPTIONS = {
  locale: 'Language of the texts: en or ru.',
  package: 'Only components of this kit entry, such as @numior/kit/forms.',
  component: 'Component name, such as NuiSelect or select.',
  example: 'Example name, such as select/Basic.',
  path: 'Page address, such as /components/button; the locale parameter picks the language.',
  query: 'Words to look for.',
  limit: 'Maximum number of results.',
  group: 'Token group, such as primary, radius or space.',
  icon: 'Part of an alias or a Lucide icon name.',
  code: 'Source of a .vue file.',
  filename: 'File name to show in the report.',
} as const;
