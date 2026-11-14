const THEME_BLOCK = /@theme(\s+[a-z]+)*\s*\{([^}]*)\}/gu;
const DECLARED = /(--[a-z0-9-]+)\s*:/gu;
const COMMENT = /\/\*[\s\S]*?\*\//gu;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gu;
const ATTRIBUTE_SELECTOR = /\[data-[a-z0-9-]*/gu;

const ATTRIBUTE_WRITE =
  /\bdata-nui-[a-z0-9-]*|\bdataset\.nui[A-Z]\w*|\bdataset\[['"]nui[A-Z]\w*['"]\]/gu;

const SELF_DECLARATION =
  /(--[a-z0-9-]+)\s*:\s*(?:--theme\(\s*\1(?=[\s)])[^)]*\)|var\(\s*\1\s*\))\s*;/gu;

const INNER_RULE = /([^{}]+)\{([^{}]*)\}/gu;
const CSS_FILE = /\.css$/u;
const VUE_FILE = /\.vue$/u;

export const ThemeGuard = Object.freeze({
  AttributeSelector: 'attribute-selector',
  AttributeWrite: 'attribute-write',
  SelfDeclaration: 'self-declaration',
  RootScopeList: 'root-scope-list',
  DerivedRead: 'derived-read',
});

const MESSAGES = {
  [ThemeGuard.AttributeSelector]:
    'themes, variants and states select BEM classes, not data attributes',
  [ThemeGuard.AttributeWrite]: 'code writes theme classes, not data-nui-* attributes',
  [ThemeGuard.SelfDeclaration]:
    'a theme key that redeclares itself is a cycle; set base keys on the scope',
  [ThemeGuard.RootScopeList]: 'theme keys live in @theme; a scope sets base keys on its own class',
  [ThemeGuard.DerivedRead]:
    'a derived key has no runtime variable; read it through --theme(--key inline) or a utility',
};

const blank = (text) => text.replace(/[^\n]/gu, ' ');

const withoutComments = (css) => css.replace(COMMENT, blank);

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const finding = (file, index, guard, detail) =>
  `${file.path}:${lineOf(file.source, index)}: ${guard}: ${detail} (${MESSAGES[guard]})`;

const stylesOf = (file) => {
  if (CSS_FILE.test(file.path)) {
    return [{ text: withoutComments(file.source), offset: 0 }];
  }

  if (!VUE_FILE.test(file.path)) {
    return [];
  }

  return [...file.source.matchAll(STYLE_BLOCK)].map((match) => ({
    text: withoutComments(match[1] ?? ''),
    offset: (match.index ?? 0) + match[0].indexOf(match[1] ?? ''),
  }));
};

const matchesIn = (file, pattern, guard) =>
  stylesOf(file).flatMap((style) =>
    [...style.text.matchAll(pattern)].map((match) =>
      finding(file, style.offset + (match.index ?? 0), guard, match[0].trim()),
    ),
  );

export const themeKeysOf = (themeCss) =>
  [...withoutComments(themeCss).matchAll(THEME_BLOCK)].reduce(
    (keys, [, modifiers = '', body = '']) => {
      const derived = modifiers.split(/\s+/u).includes('inline');

      for (const [, name] of body.matchAll(DECLARED)) {
        keys.all.add(name);

        if (!derived) {
          continue;
        }
        keys.derived.add(name);
      }

      return keys;
    },
    { all: new Set(), derived: new Set() },
  );

export const attributeSelectors = (file) =>
  matchesIn(file, ATTRIBUTE_SELECTOR, ThemeGuard.AttributeSelector);

export const attributeWrites = (file) =>
  [...file.source.matchAll(ATTRIBUTE_WRITE)].map((match) =>
    finding(file, match.index ?? 0, ThemeGuard.AttributeWrite, match[0]),
  );

export const selfDeclarations = (file) =>
  matchesIn(file, SELF_DECLARATION, ThemeGuard.SelfDeclaration);

const selectorOf = (prelude) => prelude.split(';').at(-1)?.trim() ?? '';

const isRootScopeList = (selector) => {
  const parts = selector.split(',').map((part) => part.trim());

  return parts.length > 1 && parts.includes(':root');
};

export const rootScopeLists = (file, keys) =>
  stylesOf(file).flatMap((style) =>
    [...style.text.matchAll(INNER_RULE)].reduce((found, match) => {
      const [, prelude = '', body = ''] = match;
      const selector = selectorOf(prelude);
      const declared = [...body.matchAll(DECLARED)].map(([, name]) => name);
      const themed = declared.filter((name) => keys.all.has(name));

      if (themed.length === 0 || !isRootScopeList(selector)) {
        return found;
      }

      found.push(
        finding(
          file,
          style.offset + (match.index ?? 0) + prelude.lastIndexOf(selector),
          ThemeGuard.RootScopeList,
          `${selector} declares ${themed.join(', ')}`,
        ),
      );

      return found;
    }, []),
  );

const derivedPattern = (keys) => {
  const names = [...keys.derived];

  return names.length === 0
    ? undefined
    : new RegExp(`(?:var\\(\\s*|-\\()(?:${names.join('|')})(?![a-z0-9-])`, 'gu');
};

export const derivedReads = (file, keys) => {
  const pattern = derivedPattern(keys);

  if (pattern === undefined) {
    return [];
  }

  return [...file.source.matchAll(pattern)].map((match) =>
    finding(file, match.index ?? 0, ThemeGuard.DerivedRead, match[0]),
  );
};

export const themeFindings = (files, themeCss) => {
  const keys = themeKeysOf(themeCss);

  return files.flatMap((file) => [
    ...attributeSelectors(file),
    ...attributeWrites(file),
    ...selfDeclarations(file),
    ...rootScopeLists(file, keys),
    ...derivedReads(file, keys),
  ]);
};
