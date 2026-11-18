import type { McpLocale } from '../data.types';
import { StylePlace, StyleTarget, type CheckTexts, type Override } from './check.types';
import { DEFAULT_MODEL } from './vue-names';

const MAX_LISTED_VALUES = 12;

const code = (value: string): string => `\`${value}\``;

const codes = (values: readonly string[]): string => values.map(code).join(', ');

const sentences = (...parts: readonly (string | false)[]): string =>
  parts.filter((part) => part !== false && part !== '').join(' ');

const modelName = (model: string): string =>
  model === DEFAULT_MODEL ? 'v-model' : `v-model:${model}`;

const EN_TARGETS: Readonly<Record<StyleTarget, string>> = {
  [StyleTarget.Block]: 'block',
  [StyleTarget.Part]: 'part',
  [StyleTarget.Modifier]: 'modifier',
};

const RU_TARGETS: Readonly<Record<StyleTarget, string>> = {
  [StyleTarget.Block]: 'блок',
  [StyleTarget.Part]: 'часть',
  [StyleTarget.Modifier]: 'модификатор',
};

const TAILWIND_IMPORT = code("@import 'tailwindcss';");
const KIT_STYLES_IMPORT = code("@import '@numior/kit/styles.css';");

const EN_PLACES: Readonly<Record<StylePlace, string>> = {
  [StylePlace.Script]: 'a script',
  [StylePlace.Style]: 'a <style> block',
};

const RU_PLACES: Readonly<Record<StylePlace, string>> = {
  [StylePlace.Script]: 'скрипта',
  [StylePlace.Style]: 'блока <style>',
};

const enOverrideHint = (override: Override): string =>
  sentences(
    override.props.length === 0
      ? 'Change its look through props, your own wrapper element or theme tokens (list_tokens).'
      : `Change its look through props (${codes(override.props)}), your own wrapper element or theme tokens (list_tokens).`,
    override.tokens.length > 0 && `It reads ${codes(override.tokens)}.`,
    override.target === StyleTarget.Block &&
      'To place it (width, margin, grid), put a class on your own wrapper.',
  );

const ruOverrideHint = (override: Override): string =>
  sentences(
    override.props.length === 0
      ? 'Меняйте вид через свойства, свою обёртку или токены темы (list_tokens).'
      : `Меняйте вид через свойства (${codes(override.props)}), свою обёртку или токены темы (list_tokens).`,
    override.tokens.length > 0 && `Компонент читает ${codes(override.tokens)}.`,
    override.target === StyleTarget.Block &&
      'Чтобы разместить компонент (ширина, отступы, сетка), дайте класс своей обёртке.',
  );

const en: CheckTexts = {
  unknownComponent: (name, nearest) => ({
    message: `Numior UI has no component ${code(name)}.`,
    hint:
      nearest === undefined
        ? 'list_components shows the available components.'
        : `Did you mean ${code(nearest)}?`,
  }),
  unknownProp: (component, prop, nearest) => ({
    message: `${code(component)} has no prop ${code(prop)}.`,
    hint:
      nearest === undefined
        ? `get_component ${component} lists its props and models.`
        : `Did you mean ${code(nearest)}?`,
  }),
  unknownModel: (component, model, models) => ({
    message: `${code(component)} has no ${code(modelName(model))}.`,
    hint:
      models.length === 0
        ? `${code(component)} has no models.`
        : `Its models: ${codes(models.map(modelName))}.`,
  }),
  unknownEvent: (component, event, nearest) => ({
    message: `${code(component)} emits no event ${code(event)}.`,
    hint:
      nearest === undefined
        ? `get_component ${component} lists its events.`
        : `Did you mean ${code(nearest)}?`,
  }),
  invalidValue: (component, prop, value, values, suggestion) => ({
    message: `${code(component)} does not accept ${code(`${prop}="${value}"`)}.`,
    hint: sentences(
      values.length > MAX_LISTED_VALUES
        ? `It takes one of ${values.length} values; get_component ${component} lists them.`
        : `Use one of: ${codes(values)}.`,
      suggestion.nearest !== undefined && `Did you mean ${code(suggestion.nearest)}?`,
      suggestion.otherProp !== undefined &&
        `${code(value)} is a value of ${code(suggestion.otherProp)}.`,
      suggestion.bindNumber && `Bind a number as ${code(`:${prop}="${value}"`)}.`,
    ),
  }),
  unknownExport: (source, name, suggestion) => ({
    message: `${code(source)} has no export ${code(name)}.`,
    hint: sentences(
      suggestion.owners.length > 0 && `${code(name)} is exported by ${codes(suggestion.owners)}.`,
      suggestion.owners.length === 0 &&
        suggestion.nearest !== undefined &&
        `Did you mean ${code(suggestion.nearest)}?`,
      suggestion.owners.length === 0 &&
        suggestion.nearest === undefined &&
        'list_components shows the components and their packages.',
    ),
  }),
  noDefaultExport: (source) => ({
    message: `${code(source)} has no default export.`,
    hint: `Import names in braces: ${code(`import { … } from '${source}'`)}.`,
  }),
  misplacedStyles: (path, place) => ({
    message: `${code(path)} is imported from ${EN_PLACES[place]}.`,
    hint: `Kit CSS goes into the Tailwind entry file, next to ${TAILWIND_IMPORT}; the styles of the components come in one line: ${KIT_STYLES_IMPORT}.`,
  }),
  styleOverride: (override) => ({
    message: `${code(override.selector)} restyles the ${EN_TARGETS[override.target]} ${code(override.className)} of ${codes(override.components)} from outside.`,
    hint: enOverrideHint(override),
  }),
  parseError: (block, reason) => ({
    message: `Could not parse ${block}: ${reason}`,
    hint: 'Fix the syntax and check the file again.',
  }),
};

const ru: CheckTexts = {
  unknownComponent: (name, nearest) => ({
    message: `В Numior UI нет компонента ${code(name)}.`,
    hint:
      nearest === undefined
        ? 'Список компонентов показывает list_components.'
        : `Возможно, имелся в виду ${code(nearest)}.`,
  }),
  unknownProp: (component, prop, nearest) => ({
    message: `У ${code(component)} нет свойства ${code(prop)}.`,
    hint:
      nearest === undefined
        ? `Свойства и модели ${code(component)} показывает get_component.`
        : `Возможно, имелось в виду ${code(nearest)}.`,
  }),
  unknownModel: (component, model, models) => ({
    message: `У ${code(component)} нет ${code(modelName(model))}.`,
    hint:
      models.length === 0
        ? `У ${code(component)} нет моделей.`
        : `Модели компонента: ${codes(models.map(modelName))}.`,
  }),
  unknownEvent: (component, event, nearest) => ({
    message: `У ${code(component)} нет события ${code(event)}.`,
    hint:
      nearest === undefined
        ? `События ${code(component)} показывает get_component.`
        : `Возможно, имелось в виду ${code(nearest)}.`,
  }),
  invalidValue: (component, prop, value, values, suggestion) => ({
    message: `${code(component)} не принимает ${code(`${prop}="${value}"`)}.`,
    hint: sentences(
      values.length > MAX_LISTED_VALUES
        ? `Допустимых значений ${values.length}, их перечисляет get_component ${component}.`
        : `Допустимые значения: ${codes(values)}.`,
      suggestion.nearest !== undefined && `Возможно, имелось в виду ${code(suggestion.nearest)}.`,
      suggestion.otherProp !== undefined &&
        `${code(value)} — значение свойства ${code(suggestion.otherProp)}.`,
      suggestion.bindNumber && `Число передайте привязкой: ${code(`:${prop}="${value}"`)}.`,
    ),
  }),
  unknownExport: (source, name, suggestion) => ({
    message: `В ${code(source)} нет экспорта ${code(name)}.`,
    hint: sentences(
      suggestion.owners.length > 0 && `${code(name)} экспортирует ${codes(suggestion.owners)}.`,
      suggestion.owners.length === 0 &&
        suggestion.nearest !== undefined &&
        `Возможно, имелось в виду ${code(suggestion.nearest)}.`,
      suggestion.owners.length === 0 &&
        suggestion.nearest === undefined &&
        'Компоненты и их пакеты показывает list_components.',
    ),
  }),
  noDefaultExport: (source) => ({
    message: `В ${code(source)} нет экспорта по умолчанию.`,
    hint: `Импортируйте имена в фигурных скобках: ${code(`import { … } from '${source}'`)}.`,
  }),
  misplacedStyles: (path, place) => ({
    message: `${code(path)} подключён из ${RU_PLACES[place]}.`,
    hint: `CSS кита подключается во входном файле Tailwind, рядом с ${TAILWIND_IMPORT}; стили компонентов — одной строкой ${KIT_STYLES_IMPORT}.`,
  }),
  styleOverride: (override) => ({
    message: `${code(override.selector)} стилизует снаружи ${RU_TARGETS[override.target]} ${code(override.className)} компонента ${codes(override.components)}.`,
    hint: ruOverrideHint(override),
  }),
  parseError: (block, reason) => ({
    message: `Не удалось разобрать ${block}: ${reason}`,
    hint: 'Исправьте синтаксис и проверьте файл снова.',
  }),
};

export const checkMessages: Readonly<Record<McpLocale, CheckTexts>> = { en, ru };
