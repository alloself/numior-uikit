import { kebabCase, range, uniq } from 'lodash-es';
import { AtRule, CssSyntaxError, Rule, parse, type ChildNode, type Container } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import type { SFCStyleBlock } from '@vue/compiler-sfc';
import type { McpComponent, McpData, McpProp } from '../data.types';
import {
  DiagnosticCode,
  DiagnosticSeverity,
  StyleTarget,
  type CheckTexts,
  type Diagnostic,
  type StyleFacts,
} from './check.types';
import { diagnosticAt } from './diagnostic';

interface StyleContext {
  readonly texts: CheckTexts;
  readonly blocks: ReadonlyMap<string, readonly McpComponent[]>;
  readonly block: SFCStyleBlock;
  readonly stylesheets: string[];
  readonly diagnostics: Diagnostic[];
}

type Compound = readonly selectorParser.Node[];

const THROUGH: ReadonlySet<string> = new Set([
  ':deep',
  '::v-deep',
  ':slotted',
  ':is',
  ':where',
  ':matches',
]);

const GLOBAL = ':global';
const KEYFRAMES = /keyframes$/u;
const IMPORT_PATH = /^(?:url\()?\s*['"]?([^'")\s]+)/u;
const KIT_CLASS = /^nui-/u;
const BEM_SEPARATOR = /__|--/u;
const MODIFIER = '--';
const PART = '__';
const LINE_COMMENT = /(^|[^:\\])\/\/[^\n]*/gu;
const PLAIN_CSS = 'css';
const ENUM_KIND = 'enum';
const MAX_PROPS = 6;
const MAX_TOKENS = 6;

const GENERIC_WORDS: ReadonlySet<string> = new Set([
  'top',
  'right',
  'bottom',
  'left',
  'min',
  'max',
]);

const blockIndex = (data: McpData): Map<string, McpComponent[]> =>
  Object.values(data.components).reduce((index, component) => {
    for (const block of component.styles?.blocks ?? []) {
      index.set(block.name, [...(index.get(block.name) ?? []), component]);
    }
    return index;
  }, new Map<string, McpComponent[]>());

const blockOf = (blocks: StyleContext['blocks'], className: string): string | undefined => {
  const segments = (className.split(BEM_SEPARATOR)[0] ?? '').split('-');

  return range(segments.length, 1, -1)
    .map((size) => segments.slice(0, size).join('-'))
    .find((name) => blocks.has(name));
};

const targetOf = (className: string): StyleTarget => {
  if (className.includes(MODIFIER)) {
    return StyleTarget.Modifier;
  }
  return className.includes(PART) ? StyleTarget.Part : StyleTarget.Block;
};

const subjectOf = (nodes: Compound): Compound =>
  nodes.slice(nodes.findLastIndex((node) => node.type === 'combinator') + 1);

const subjectClasses = (selector: selectorParser.Selector, counted: boolean): string[] =>
  subjectOf(selector.nodes).flatMap((node) => {
    if (node.type === 'class') {
      return counted ? [node.value] : [];
    }
    if (node.type !== 'pseudo') {
      return [];
    }
    const value = node.value.toLowerCase();

    if (value === GLOBAL) {
      return node.nodes.flatMap((inner) => subjectClasses(inner, true));
    }
    return THROUGH.has(value) ? node.nodes.flatMap((inner) => subjectClasses(inner, counted)) : [];
  });

const classesOf = (selector: string, module: boolean): string[] => {
  try {
    return selectorParser()
      .astSync(selector)
      .nodes.flatMap((node) => subjectClasses(node, !module));
  } catch {
    return [];
  }
};

const resolvedSelectors = (rule: Rule): string[] => {
  const parent = rule.parent;

  if (!(parent instanceof Rule)) {
    return rule.selectors;
  }
  return resolvedSelectors(parent).flatMap((outer) =>
    rule.selectors.map((inner) =>
      inner.includes('&') ? inner.replaceAll('&', outer) : `${outer} ${inner}`,
    ),
  );
};

const inKeyframes = (node: Container | ChildNode | undefined): boolean => {
  if (node instanceof AtRule) {
    return KEYFRAMES.test(node.name) || inKeyframes(node.parent);
  }
  return node instanceof Rule ? inKeyframes(node.parent) : false;
};

const wordsOf = (property: string): string[] =>
  property.split('-').filter((word) => word.length > 1 && !GENERIC_WORDS.has(word));

const tokensFor = (component: McpComponent, rule: Rule): string[] => {
  const words = rule.nodes.flatMap((node) => (node.type === 'decl' ? wordsOf(node.prop) : []));

  return (component.styles?.tokens ?? []).reduce<string[]>((found, token) => {
    if (found.length < MAX_TOKENS && words.some((word) => token.includes(word))) {
      found.push(token);
    }
    return found;
  }, []);
};

const ownersOf = (block: string, components: readonly McpComponent[]): readonly McpComponent[] => {
  const own = components.filter((component) => kebabCase(component.name) === block);

  return own.length > 0 ? own : components;
};

const modifiersOf = (component: McpComponent, block: string): ReadonlySet<string> =>
  new Set(component.styles?.blocks.find((candidate) => candidate.name === block)?.modifiers);

const styledBy = (prop: McpProp, modifiers: ReadonlySet<string>): boolean => {
  const name = kebabCase(prop.name);

  return (
    modifiers.has(name) || (prop.values ?? []).some((value) => modifiers.has(`${name}-${value}`))
  );
};

const lookProps = (component: McpComponent, block: string): string[] => {
  const modifiers = modifiersOf(component, block);
  const styling = component.props.flatMap((prop) => (styledBy(prop, modifiers) ? [prop.name] : []));

  return styling.length > 0
    ? styling
    : component.props.flatMap((prop) => (prop.kind === ENUM_KIND ? [prop.name] : []));
};

const propsFor = (components: readonly McpComponent[], block: string): string[] =>
  uniq(components.flatMap((component) => lookProps(component, block))).slice(0, MAX_PROPS);

const lineOf = (context: StyleContext, line: number | undefined): number =>
  context.block.loc.start.line + (line ?? 1) - 1;

const overrideOf = (
  context: StyleContext,
  rule: Rule,
  selector: string,
  className: string,
): Diagnostic | undefined => {
  const block = KIT_CLASS.test(className) ? blockOf(context.blocks, className) : undefined;
  const components = block === undefined ? [] : ownersOf(block, context.blocks.get(block) ?? []);
  const owner = components[0];

  if (block === undefined || owner === undefined) {
    return undefined;
  }
  return diagnosticAt(
    {
      line: lineOf(context, rule.source?.start?.line),
      column: rule.source?.start?.column ?? 1,
    },
    DiagnosticSeverity.Warning,
    DiagnosticCode.StyleOverride,
    context.texts.styleOverride({
      selector: selector.trim(),
      className,
      target: targetOf(className),
      components: components.map((component) => component.name),
      props: propsFor(components, block),
      tokens: tokensFor(owner, rule),
    }),
  );
};

const checkRule = (context: StyleContext, rule: Rule): void => {
  if (inKeyframes(rule.parent)) {
    return;
  }
  const module = Boolean(context.block.module);

  for (const selector of resolvedSelectors(rule)) {
    for (const className of new Set(classesOf(selector, module))) {
      const override = overrideOf(context, rule, selector, className);

      if (override === undefined) {
        continue;
      }

      context.diagnostics.push(override);
    }
  }
};

const collectImport = (context: StyleContext, rule: AtRule): void => {
  const path = IMPORT_PATH.exec(rule.params.trim())?.[1];

  if (path === undefined) {
    return;
  }

  context.stylesheets.push(path);
};

const readable = (block: SFCStyleBlock): string =>
  block.lang === undefined || block.lang === PLAIN_CSS
    ? block.content
    : block.content.replaceAll(
        LINE_COMMENT,
        (comment, lead: string) => `${lead}${' '.repeat(comment.length - lead.length)}`,
      );

const checkBlock = (context: StyleContext): void => {
  try {
    const root = parse(readable(context.block));

    root.walkAtRules('import', (rule) => collectImport(context, rule));
    root.walkRules((rule) => checkRule(context, rule));
  } catch (error) {
    if (!(error instanceof CssSyntaxError)) {
      throw error;
    }

    context.diagnostics.push(
      diagnosticAt(
        { line: lineOf(context, error.line), column: error.column ?? 1 },
        DiagnosticSeverity.Warning,
        DiagnosticCode.ParseError,
        context.texts.parseError('<style>', error.reason),
      ),
    );
  }
};

export const styleFacts = (
  data: McpData,
  texts: CheckTexts,
  blocks: readonly SFCStyleBlock[],
): StyleFacts => {
  const index = blockIndex(data);
  const stylesheets: string[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const block of blocks) {
    checkBlock({ texts, blocks: index, block, stylesheets, diagnostics });
  }
  return { stylesheets, diagnostics };
};
