import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  NodeTypes,
  type AttributeNode,
  type DirectiveNode,
  type ExpressionNode,
  type TemplateChildNode,
} from '@vue/compiler-core';
import { parse } from '@vue/compiler-sfc';
import { EXAMPLE_LOCALES, exampleNames, exampleSources } from './modules.ts';
import type { ExampleLocale, ExampleSources } from './example.types.ts';

const STRING_RE = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

const NUMBER_RE = /\b\d[\d_]*(?:\.\d+)?\b/g;

const withoutStrings = (code: string): string =>
  code.replace(STRING_RE, '""').replace(/\s+/g, ' ').trim();

const expressionOf = (node: ExpressionNode | undefined): string =>
  node?.type === NodeTypes.SIMPLE_EXPRESSION ? withoutStrings(node.content) : '';

const propSignature = (prop: AttributeNode | DirectiveNode): string =>
  prop.type === NodeTypes.ATTRIBUTE
    ? prop.name
    : `${prop.name}:${expressionOf(prop.arg)}=${expressionOf(prop.exp)}`;

const nodeSignature = (node: TemplateChildNode): string => {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      return `<${node.tag} ${[...node.props].map(propSignature).toSorted().join(' ')}>${node.children
        .map(nodeSignature)
        .join('')}</${node.tag}>`;
    case NodeTypes.TEXT:
      return '#text';
    case NodeTypes.INTERPOLATION:
      return `{{${expressionOf(node.content)}}}`;
    default:
      return '';
  }
};

export const exampleSignature = (source: string): string => {
  const { descriptor } = parse(source);
  const template = descriptor.template?.ast?.children.map(nodeSignature).join('') ?? '';

  const scripts = [descriptor.scriptSetup, descriptor.script]
    .map((block) => withoutStrings(block?.content ?? ''))
    .join('|');

  return `${template}|${scripts}|styles:${descriptor.styles.length}`;
};

const fileSignature = (file: string): string => {
  const source = readFileSync(file, 'utf8');

  return file.endsWith('.vue') ? exampleSignature(source) : withoutStrings(source);
};

const sourcesSignature = (sources: ExampleSources): string =>
  sources.files.map((file) => `${basename(file)}=${fileSignature(file)}`).join('\n');

const otherLocale = (locale: ExampleLocale): ExampleLocale => (locale === 'ru' ? 'en' : 'ru');

const styledFiles = (sources: ExampleSources): string[] =>
  sources.files.filter(
    (file) =>
      file.endsWith('.vue') && parse(readFileSync(file, 'utf8')).descriptor.styles.length > 0,
  );

export const compareExamples = (root: string): string[] => {
  const names = exampleNames(root);
  const problems: string[] = [];

  for (const locale of EXAMPLE_LOCALES) {
    for (const name of names[locale]) {
      if (names[otherLocale(locale)].includes(name)) {
        continue;
      }

      problems.push(`${otherLocale(locale)}/${name} is missing`);
    }
  }
  for (const name of names.ru.filter((entry) => names.en.includes(entry))) {
    const ru = exampleSources(root, `ru/${name}`);
    const en = exampleSources(root, `en/${name}`);

    if (ru === undefined || en === undefined) {
      continue;
    }
    for (const file of [...styledFiles(ru), ...styledFiles(en)]) {
      problems.push(`${file} has a style block`);
    }
    if (sourcesSignature(ru) === sourcesSignature(en)) {
      continue;
    }

    problems.push(`ru/${name} and en/${name} differ beyond their strings`);
  }
  return problems;
};

const dataSignature = (file: string): string =>
  withoutStrings(readFileSync(file, 'utf8')).replace(NUMBER_RE, '0');

const dataNames = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith('.ts'))
        .toSorted()
    : [];

export const compareDemo = (demoRoot: string): string[] => {
  const names = { ru: dataNames(join(demoRoot, 'ru')), en: dataNames(join(demoRoot, 'en')) };

  const missing = EXAMPLE_LOCALES.flatMap((locale) =>
    names[locale].reduce<string[]>((problems, name) => {
      if (!names[otherLocale(locale)].includes(name)) {
        problems.push(`demo/${otherLocale(locale)}/${name} is missing`);
      }
      return problems;
    }, []),
  );

  return names.ru.reduce<string[]>((problems, name) => {
    const [ru, en] = [join(demoRoot, 'ru', name), join(demoRoot, 'en', name)];

    if (names.en.includes(name) && dataSignature(ru) !== dataSignature(en)) {
      problems.push(`demo/ru/${name} and demo/en/${name} differ beyond their strings and numbers`);
    }
    return problems;
  }, missing);
};
