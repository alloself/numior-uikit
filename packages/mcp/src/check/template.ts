import {
  NodeTypes,
  type AttributeNode,
  type DirectiveNode,
  type ElementNode,
  type ExpressionNode,
  type RootNode,
  type TemplateChildNode,
} from '@vue/compiler-core';
import type { McpComponent, McpData, McpProp } from '../data.types';
import { nearest } from '../nearest';
import {
  DiagnosticCode,
  DiagnosticSeverity,
  type CheckTexts,
  type Diagnostic,
  type NamedImport,
  type Position,
  type TemplateFacts,
} from './check.types';
import { diagnosticAt } from './diagnostic';
import {
  DEFAULT_MODEL,
  DOM_EVENT_NAMES,
  eventName,
  isNativeEvent,
  kitTagName,
  pascalTagName,
  passesThrough,
  propName,
} from './vue-names';

interface TemplateContext {
  readonly data: McpData;
  readonly texts: CheckTexts;
  readonly aliases: ReadonlyMap<string, string>;
  readonly locals: ReadonlySet<string>;
  readonly diagnostics: Diagnostic[];
}

const BIND = 'bind';
const ON = 'on';
const MODEL = 'model';
const KIT_SOURCE = /^@numior\//u;
const KIT_COMPONENT = /^Nui[A-Z]/u;
const QUOTED = /^(?:'([^']*)'|"([^"]*)"|`([^`$]*)`)$/u;
const NUMBER = /^-?\d+(?:\.\d+)?$/u;
const NUMBER_TYPE = /\bnumber\b/u;
const BOOLEAN_LITERALS: ReadonlySet<string> = new Set(['true', 'false']);
const PRESENT = 'true';

const positionOf = (node: AttributeNode | DirectiveNode | ElementNode): Position => ({
  line: node.loc.start.line,
  column: node.loc.start.column,
});

const staticArgument = (argument: ExpressionNode | undefined): string | undefined =>
  argument?.type === NodeTypes.SIMPLE_EXPRESSION && argument.isStatic
    ? argument.content
    : undefined;

const literalOf = (expression: ExpressionNode | undefined): string | undefined => {
  if (expression?.type !== NodeTypes.SIMPLE_EXPRESSION) {
    return undefined;
  }
  const content = expression.content.trim();

  if (BOOLEAN_LITERALS.has(content)) {
    return content;
  }
  const match = QUOTED.exec(content);

  return match === null ? undefined : (match[1] ?? match[2] ?? match[3]);
};

const propsOf = (component: McpComponent): string[] => [
  ...component.props.map((prop) => prop.name),
  ...component.models.map((model) => model.prop),
];

const eventsOf = (component: McpComponent): string[] => [
  ...component.events.map((event) => event.name),
  ...component.models.map((model) => model.event),
];

const otherPropWith = (component: McpComponent, prop: McpProp, value: string) =>
  component.props.find(
    (candidate) => candidate !== prop && (candidate.values ?? []).includes(value),
  )?.name;

const checkValue = (
  context: TemplateContext,
  component: McpComponent,
  prop: McpProp,
  value: string,
  position: Position,
): void => {
  const values = prop.values ?? [];

  if (values.length === 0 || values.includes(value)) {
    return;
  }

  context.diagnostics.push(
    diagnosticAt(
      position,
      DiagnosticSeverity.Error,
      DiagnosticCode.InvalidValue,
      context.texts.invalidValue(component.name, prop.name, value, values, {
        nearest: nearest(value, values),
        otherProp: otherPropWith(component, prop, value),
        bindNumber: NUMBER.test(value) && NUMBER_TYPE.test(prop.type),
      }),
    ),
  );
};

const checkProp = (
  context: TemplateContext,
  component: McpComponent,
  attribute: string,
  value: string | undefined,
  position: Position,
): void => {
  const name = propName(attribute);
  const prop = component.props.find((candidate) => candidate.name === name);
  const known = prop !== undefined || propsOf(component).includes(name);

  if (!known && !passesThrough(attribute)) {
    context.diagnostics.push(
      diagnosticAt(
        position,
        DiagnosticSeverity.Warning,
        DiagnosticCode.UnknownProp,
        context.texts.unknownProp(component.name, name, nearest(name, propsOf(component))),
      ),
    );
  }
  if (prop === undefined || value === undefined) {
    return;
  }

  checkValue(context, component, prop, value, position);
};

const checkEvent = (
  context: TemplateContext,
  component: McpComponent,
  attribute: string,
  position: Position,
): void => {
  const name = eventName(attribute);
  const events = eventsOf(component);

  if (events.includes(name) || isNativeEvent(name)) {
    return;
  }

  context.diagnostics.push(
    diagnosticAt(
      position,
      DiagnosticSeverity.Warning,
      DiagnosticCode.UnknownEvent,
      context.texts.unknownEvent(
        component.name,
        name,
        nearest(name, [...events, ...DOM_EVENT_NAMES]),
      ),
    ),
  );
};

const checkModel = (
  context: TemplateContext,
  component: McpComponent,
  argument: string | undefined,
  position: Position,
): void => {
  const model = argument === undefined ? DEFAULT_MODEL : propName(argument);
  const models = component.models.map((candidate) => candidate.prop);

  if (models.includes(model)) {
    return;
  }

  context.diagnostics.push(
    diagnosticAt(
      position,
      DiagnosticSeverity.Warning,
      DiagnosticCode.UnknownProp,
      context.texts.unknownModel(component.name, model, models),
    ),
  );
};

const checkDirective = (
  context: TemplateContext,
  component: McpComponent,
  directive: DirectiveNode,
): void => {
  const argument = staticArgument(directive.arg);
  const position = positionOf(directive);

  if (directive.name === MODEL) {
    checkModel(context, component, argument, position);

    return;
  }
  if (argument === undefined) {
    return;
  }
  if (directive.name === ON) {
    checkEvent(context, component, argument, position);

    return;
  }
  if (directive.name !== BIND) {
    return;
  }

  checkProp(context, component, argument, literalOf(directive.exp), position);
};

const checkAttributes = (
  context: TemplateContext,
  component: McpComponent,
  element: ElementNode,
): void => {
  for (const attribute of element.props) {
    if (attribute.type === NodeTypes.DIRECTIVE) {
      checkDirective(context, component, attribute);

      continue;
    }

    checkProp(
      context,
      component,
      attribute.name,
      attribute.value?.content || PRESENT,
      positionOf(attribute),
    );
  }
};

const componentNameOf = (context: TemplateContext, tag: string): string | undefined => {
  const pascal = pascalTagName(tag);

  if (context.locals.has(pascal)) {
    return undefined;
  }
  return context.aliases.get(pascal) ?? kitTagName(tag);
};

const visitElement = (context: TemplateContext, element: ElementNode): void => {
  const name = componentNameOf(context, element.tag);

  if (name === undefined) {
    return;
  }
  const component = context.data.components[name];

  if (component === undefined) {
    context.diagnostics.push(
      diagnosticAt(
        positionOf(element),
        DiagnosticSeverity.Error,
        DiagnosticCode.UnknownComponent,
        context.texts.unknownComponent(name, nearest(name, Object.keys(context.data.components))),
      ),
    );

    return;
  }

  checkAttributes(context, component, element);
};

const walk = (context: TemplateContext, nodes: readonly TemplateChildNode[]): void => {
  for (const node of nodes) {
    if (node.type !== NodeTypes.ELEMENT) {
      continue;
    }

    visitElement(context, node);
    walk(context, node.children);
  }
};

const importedNames = (imports: readonly NamedImport[]) =>
  imports.reduce(
    (found, entry) => {
      if (entry.imported === undefined) {
        return found;
      }
      if (KIT_SOURCE.test(entry.source)) {
        if (KIT_COMPONENT.test(entry.imported)) {
          found.aliases.set(entry.local, entry.imported);
        }
        return found;
      }
      found.locals.add(entry.local);

      return found;
    },
    { aliases: new Map<string, string>(), locals: new Set<string>() },
  );

export const templateFacts = (
  data: McpData,
  texts: CheckTexts,
  root: RootNode | undefined,
  imports: readonly NamedImport[],
): TemplateFacts => {
  const context: TemplateContext = {
    data,
    texts,
    ...importedNames(imports),
    diagnostics: [],
  };

  walk(context, root?.children ?? []);

  return { diagnostics: context.diagnostics };
};
