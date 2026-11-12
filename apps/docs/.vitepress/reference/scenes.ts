import {
  NodeTypes,
  type AttributeNode,
  type DirectiveNode,
  type ElementNode,
  type TemplateChildNode,
} from '@vue/compiler-core';
import { parse } from '@vue/compiler-sfc';
import { camelCase } from 'lodash-es';
import type { ExampleLocale } from '../examples/example.types.ts';
import type { ReferenceConfigurator } from './reference.types.ts';

export type SceneSource = (locale: ExampleLocale, name: string) => string | undefined;

const LOCALES: readonly ExampleLocale[] = ['ru', 'en'];
const MODEL = 'modelValue';
const OWN_ATTRS = /inheritAttrs:\s*false/;

const elementsOf = (nodes: readonly TemplateChildNode[]): ElementNode[] =>
  nodes.flatMap((node) =>
    node.type === NodeTypes.ELEMENT ? [node, ...elementsOf(node.children)] : [],
  );

const argumentOf = (directive: DirectiveNode): string | undefined =>
  directive.arg?.type === NodeTypes.SIMPLE_EXPRESSION
    ? camelCase(directive.arg.content)
    : undefined;

const nameOf = (prop: AttributeNode | DirectiveNode): string | undefined => {
  if (prop.type === NodeTypes.ATTRIBUTE) {
    return camelCase(prop.name);
  }
  if (prop.name === 'model') {
    return argumentOf(prop) ?? MODEL;
  }
  return prop.name === 'bind' ? argumentOf(prop) : undefined;
};

const passesAttrs = (prop: AttributeNode | DirectiveNode): boolean =>
  prop.type === NodeTypes.DIRECTIVE &&
  prop.name === 'bind' &&
  prop.arg === undefined &&
  prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION &&
  prop.exp.content === '$attrs';

const attrsProblem = (source: string, roots: readonly ElementNode[], target: ElementNode) => {
  if (roots.length === 1 && roots[0] === target) {
    return undefined;
  }
  if (!target.props.some(passesAttrs)) {
    return 'does not pass attributes to the component: make it the only root or bind $attrs';
  }
  return roots.length === 1 && !OWN_ATTRS.test(source)
    ? 'passes attributes to both the root and the component: set inheritAttrs to false'
    : undefined;
};

const sourceProblems = (
  component: string,
  props: readonly string[],
  source: string | undefined,
): string[] => {
  if (source === undefined) {
    return ['has no example'];
  }

  const roots = (parse(source).descriptor.template?.ast?.children ?? []).reduce<ElementNode[]>(
    (found, node) => {
      if (node.type === NodeTypes.ELEMENT) {
        found.push(node);
      }
      return found;
    },
    [],
  );

  const target = elementsOf(roots).find((element) => element.tag === component);

  if (target === undefined) {
    return [`does not render <${component}>`];
  }
  const own = new Set(target.props.map(nameOf));
  const attrs = attrsProblem(source, roots, target);

  return [
    ...(attrs === undefined ? [] : [attrs]),
    ...props.reduce<string[]>((found, name) => {
      if (own.has(name)) {
        found.push(`sets the configured prop "${name}" itself`);
      }
      return found;
    }, []),
  ];
};

export const sceneProblems = (
  component: string,
  configurator: ReferenceConfigurator | undefined,
  sourceOf: SceneSource,
): string[] => {
  const scene = configurator?.scene;

  if (configurator === undefined || scene === undefined) {
    return [];
  }
  return [
    ...(configurator.content === undefined
      ? []
      : [`${component}: configurator content has no effect next to the scene ${scene}`]),
    ...LOCALES.flatMap((locale) =>
      sourceProblems(component, configurator.props, sourceOf(locale, scene)).map(
        (problem) => `${component}: configurator scene ${locale}/${scene} ${problem}`,
      ),
    ),
  ];
};
