import { NodeTypes, type TemplateChildNode } from '@vue/compiler-core';
import { parse } from '@vue/compiler-sfc';
import type { ExampleLocale } from '../examples/example.types.ts';
import { GuardRule, type ExampleContext, type GuardProblem } from './guard.types.ts';
import { patternProblems, termProblems } from './page-guards.ts';
import { FILLERS, GLOSSARY, META, NAME, NOT_NAMES } from './terms.ts';

const STRING_RE = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const IMPORT_RE = /import\s[^;]*?from\s+'[^']+';/g;
const VUE_IMPORT_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@numior\/vue'/g;
const REEXPORT_RE = /export\s+\{([^}]*)\}\s+from\s+'@numior\/primitives'/g;
const DUMP_RE = />\s*([\p{Lu}][\p{L} ]{0,40}:)\s*\{\{/gu;
const VALUE_NAME_RE = /^[a-z]/;
const IDENTIFIER_RE = /^[a-z][\w-]*$/;

const namesIn = (list: string): string[] =>
  list.split(',').reduce<string[]>((names, raw) => {
    const [name = ''] = raw.trim().split(/\s+as\s+/);

    if (name !== '' && !name.startsWith('type ')) {
      names.push(name);
    }
    return names;
  }, []);

export const misplacedExports = (vueIndex: string): Set<string> =>
  new Set(
    [...vueIndex.matchAll(REEXPORT_RE)]
      .flatMap(([, list = '']) => namesIn(list))
      .filter((name) => VALUE_NAME_RE.test(name)),
  );

const textsOfNode = (node: TemplateChildNode): string[] => {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      return [
        ...node.props.flatMap((prop) =>
          prop.type === NodeTypes.ATTRIBUTE && prop.value !== undefined ? [prop.value.content] : [],
        ),
        ...node.children.flatMap(textsOfNode),
      ];
    case NodeTypes.TEXT:
      return [node.content.trim()];
    default:
      return [];
  }
};

const stringsOf = (code: string): string[] =>
  [...code.replace(IMPORT_RE, '').matchAll(STRING_RE)].map(
    ([, single, double, template]) => single ?? double ?? template ?? '',
  );

export const exampleTextsOf = (source: string): string[] => {
  const { descriptor } = parse(source);

  return [
    ...(descriptor.template?.ast?.children.flatMap(textsOfNode) ?? []),
    ...stringsOf(descriptor.scriptSetup?.content ?? ''),
  ].filter((text) => text !== '');
};

const namesOf = (text: string, locale: ExampleLocale): string[] =>
  NAME[locale].flatMap((pattern) => text.match(pattern) ?? []);

export const vocabularyOf = (sources: readonly string[], locale: ExampleLocale): Set<string> =>
  new Set(sources.flatMap((source) => namesOf(source, locale)));

const strangers = (texts: readonly string[], locale: ExampleLocale, known: ReadonlySet<string>) =>
  texts
    .flatMap((text) => namesOf(text, locale))
    .filter((name) => !known.has(name) && !NOT_NAMES.has(name));

const misplacedImports = (source: string, misplaced: ReadonlySet<string>): string[] =>
  [...source.matchAll(VUE_IMPORT_RE)]
    .flatMap(([, list = '']) => namesIn(list))
    .filter((name) => misplaced.has(name));

export const exampleGuards = (
  file: string,
  locale: ExampleLocale,
  source: string,
  context: ExampleContext,
): GuardProblem[] => {
  const texts = exampleTextsOf(source);

  return [
    ...texts
      .flatMap((text) => patternProblems(text, locale, FILLERS))
      .map((text) => ({ rule: GuardRule.Filler, file, text })),
    ...texts
      .flatMap((text) => patternProblems(text, locale, META))
      .map((text) => ({ rule: GuardRule.Meta, file, text })),
    ...texts
      .flatMap((text) => (IDENTIFIER_RE.test(text) ? [] : termProblems(text, locale, GLOSSARY)))
      .map((text) => ({ rule: GuardRule.Glossary, file, text })),
    ...[...source.matchAll(DUMP_RE)].map(([, label = '']) => ({
      rule: GuardRule.Dump,
      file,
      text: `${label} {{ … }}`,
    })),
    ...strangers(texts, locale, context.vocabulary).map((text) => ({
      rule: GuardRule.Names,
      file,
      text: `${text} is not in the shop data`,
    })),
    ...misplacedImports(source, context.misplaced).map((name) => ({
      rule: GuardRule.Imports,
      file,
      text: `${name} is declared in @numior/primitives`,
    })),
  ];
};
