import type { McpLocale } from './data.types';
import type { ToolTexts } from './tools.types';

const code = (value: string): string => `\`${value}\``;

const codes = (values: readonly string[]): string => values.map(code).join(', ');

const en: ToolTexts = {
  unknownComponent: (name, nearest) =>
    nearest === undefined
      ? `Numior UI has no component ${code(name)}. list_components shows the available components.`
      : `Numior UI has no component ${code(name)}. Did you mean ${code(nearest)}?`,
  unknownPackage: (name, packages) =>
    `No components come from ${code(name)}. Packages with components: ${codes(packages)}.`,
  unknownExample: (name, suggestions) =>
    suggestions.length === 0
      ? `There is no example ${code(name)}. Names look like ${code('select/Basic')}; get_page prints the examples of a page as code.`
      : `There is no example ${code(name)}. Close names: ${codes(suggestions)}.`,
  unknownPage: (path, nearest) =>
    nearest === undefined
      ? `There is no page ${code(path)}. search finds pages by words.`
      : `There is no page ${code(path)}. Did you mean ${code(nearest)}?`,
  unknownGroup: (group, groups) =>
    `There is no token group ${code(group)}. Groups: ${codes(groups)}.`,
};

const ru: ToolTexts = {
  unknownComponent: (name, nearest) =>
    nearest === undefined
      ? `В Numior UI нет компонента ${code(name)}. Список компонентов показывает list_components.`
      : `В Numior UI нет компонента ${code(name)}. Возможно, имелся в виду ${code(nearest)}.`,
  unknownPackage: (name, packages) =>
    `В ${code(name)} нет компонентов. Пакеты с компонентами: ${codes(packages)}.`,
  unknownExample: (name, suggestions) =>
    suggestions.length === 0
      ? `Примера ${code(name)} нет. Имена выглядят как ${code('select/Basic')}; get_page выводит примеры страницы кодом.`
      : `Примера ${code(name)} нет. Похожие имена: ${codes(suggestions)}.`,
  unknownPage: (path, nearest) =>
    nearest === undefined
      ? `Страницы ${code(path)} нет. Страницы по словам находит search.`
      : `Страницы ${code(path)} нет. Возможно, имелась в виду ${code(nearest)}.`,
  unknownGroup: (group, groups) => `Группы токенов ${code(group)} нет. Группы: ${codes(groups)}.`,
};

export const toolMessages: Readonly<Record<McpLocale, ToolTexts>> = { en, ru };
