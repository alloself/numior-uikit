import { extname } from 'node:path';
import { blockExampleOf } from '../blocks.ts';
import type { ComponentReference, DeclarationReference } from '../reference/reference.types.ts';
import { tokenRowsOf } from '../theme/token-sections.ts';
import { TokenSection } from '../theme/theme.types.ts';
import type { TwinContext, TwinFile } from './llms.types.ts';
import { componentApi, iconTable, keyboardTable, signatureBlock, tokenTable } from './tables.ts';

type TagRenderer = (attributes: string, context: TwinContext) => string[];

interface TwinState {
  fence: string | undefined;
  open: string | undefined;
}

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n/;
const TAG_RE = /^<([A-Z][A-Za-z]+)\b([^>]*?)\/?>\s*$/;
const NAME_RE = /\bname="([^"]+)"/;
const NAMES_RE = /:names="\[([^\]]*)\]"/;
const SECTION_RE = /\bsection="([^"]+)"/;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;
const CONTAINER_RE = /^:::/;
const BLANKS_RE = /\n{3,}/g;
const TICKS_RE = /`+/g;
const SECTIONS: ReadonlySet<string> = new Set(Object.values(TokenSection));

const isSection = (value: string | undefined): value is TokenSection =>
  value !== undefined && SECTIONS.has(value);

const namesOf = (attributes: string): string[] => {
  const single = NAME_RE.exec(attributes)?.[1];

  if (single !== undefined) {
    return [single];
  }
  return (NAMES_RE.exec(attributes)?.[1] ?? '').split(',').reduce<string[]>((names, raw) => {
    const name = raw.trim().replaceAll(/['"]/g, '');

    if (name !== '') {
      names.push(name);
    }
    return names;
  }, []);
};

const fenceFor = (source: string): string => {
  const longest = (source.match(TICKS_RE) ?? []).reduce(
    (size, run) => Math.max(size, run.length),
    0,
  );

  return '`'.repeat(Math.max(3, longest + 1));
};

const fileBlock = (file: TwinFile, labelled: boolean): string[] => {
  const fence = fenceFor(file.source);

  return [
    ...(labelled ? [`\`${file.name}\``, ''] : []),
    `${fence}${extname(file.name).slice(1)}`,
    file.source.trimEnd(),
    fence,
    '',
  ];
};

const exampleNamed = (name: string | undefined, context: TwinContext): string[] => {
  const files = name === undefined ? undefined : context.exampleOf(name);

  return files === undefined ? [] : files.flatMap((file) => fileBlock(file, files.length > 1));
};

const exampleBlocks: TagRenderer = (attributes, context) =>
  exampleNamed(NAME_RE.exec(attributes)?.[1], context);

const blockBlocks: TagRenderer = (attributes, context) => {
  const name = NAME_RE.exec(attributes)?.[1];

  return exampleNamed(name === undefined ? undefined : blockExampleOf(name), context);
};

const sceneBlocks: TagRenderer = (attributes, context) =>
  exampleNamed(
    context.bundle?.components[NAME_RE.exec(attributes)?.[1] ?? '']?.configurator?.scene,
    context,
  );

const componentsOf = (attributes: string, context: TwinContext): ComponentReference[] =>
  namesOf(attributes).reduce<ComponentReference[]>((found, name) => {
    const component = context.bundle?.components[name];

    if (component !== undefined) {
      found.push(component);
    }
    return found;
  }, []);

const apiBlocks: TagRenderer = (attributes, context) => {
  const { bundle, locale, texts } = context;

  return bundle === undefined
    ? []
    : componentsOf(attributes, context).flatMap((component) =>
        componentApi(bundle, component, locale, texts),
      );
};

const keyboardBlocks: TagRenderer = (attributes, context) =>
  componentsOf(attributes, context).flatMap((component) =>
    keyboardTable(component.keyboard, context.locale, context.texts),
  );

const signatureBlocks: TagRenderer = (attributes, context) =>
  namesOf(attributes).reduce<string[]>((lines, name) => {
    const declaration: DeclarationReference | undefined = context.bundle?.declarations.find(
      (candidate) => candidate.name === name,
    );

    if (declaration !== undefined) {
      lines.push(...signatureBlock(declaration));
    }
    return lines;
  }, []);

const tokenBlocks: TagRenderer = (attributes, context) => {
  const section = SECTION_RE.exec(attributes)?.[1];

  return context.bundle === undefined || !isSection(section)
    ? []
    : tokenTable(tokenRowsOf(context.bundle.tokens, section), context.texts);
};

const iconBlocks: TagRenderer = (_attributes, context) =>
  context.bundle === undefined ? [] : iconTable(context.bundle.icons, context.texts);

const RENDERERS: Readonly<Record<string, TagRenderer>> = {
  Example: exampleBlocks,
  Block: blockBlocks,
  ThemeCompare: blockBlocks,
  Configurator: sceneBlocks,
  ApiReference: apiBlocks,
  KeyboardReference: keyboardBlocks,
  SignatureReference: signatureBlocks,
  TokenReference: tokenBlocks,
  IconReference: iconBlocks,
};

const isCode = (state: TwinState, line: string): boolean => {
  const marker = FENCE_RE.exec(line)?.[1];

  if (state.fence !== undefined) {
    state.fence = marker !== undefined && marker.startsWith(state.fence) ? undefined : state.fence;

    return true;
  }
  state.fence = marker;

  return marker !== undefined;
};

const renderLine = (line: string, context: TwinContext): string[] => {
  if (CONTAINER_RE.test(line)) {
    return [];
  }
  const tag = TAG_RE.exec(line);
  const render = tag?.[1] === undefined ? undefined : RENDERERS[tag[1]];

  return render === undefined ? [line] : render(tag?.[2] ?? '', context);
};

const OPEN_TAG_RE = /^<[A-Z][A-Za-z]+\b[^>]*$/;

const joinTags = (lines: readonly string[]): string[] => {
  const state: TwinState = { fence: undefined, open: undefined };

  return lines.reduce<string[]>((joined, line) => {
    if (state.open !== undefined) {
      state.open = `${state.open} ${line.trim()}`;
      if (line.includes('>')) {
        joined.push(state.open);
        state.open = undefined;
      }
      return joined;
    }
    if (isCode(state, line) || !OPEN_TAG_RE.test(line)) {
      joined.push(line);

      return joined;
    }
    state.open = line;

    return joined;
  }, []);
};

export const pageTwin = (source: string, context: TwinContext): string => {
  const state: TwinState = { fence: undefined, open: undefined };

  const markdown = source.replace(FRONTMATTER_RE, '');

  const lines = joinTags(markdown.split('\n')).flatMap((line) =>
    isCode(state, line) ? [line] : renderLine(line, context),
  );

  return `${lines.join('\n').replaceAll(BLANKS_RE, '\n\n').trim()}\n`;
};
