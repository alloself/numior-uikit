import { GuardRule, type GuardProblem } from './guard.types.ts';

const FENCE_RE = /^(`{3,})[^\n`]*\n([\s\S]*?)^\1[ \t]*$/gm;

const COMPONENT_STYLES_RE =
  /^@?import\s+(?:url\()?'@numior\/kit\/(?:[a-z-]+\/)*styles(?:\/[^']+)?\.css'/m;

const WHOLE_KIT = "'@numior/kit/styles.css'";

const LISTED =
  'a code block imports the styles of components or a module; @numior/kit/styles.css brings them';

const listsComponentStyles = (code: string): boolean =>
  code.split('\n').some((line) => COMPONENT_STYLES_RE.test(line) && !line.includes(WHOLE_KIT));

export const styleGuards = (page: string, source: string): GuardProblem[] =>
  [...source.matchAll(FENCE_RE)].flatMap(([, , code = '']) =>
    listsComponentStyles(code) ? [{ rule: GuardRule.Styles, file: page, text: LISTED }] : [],
  );
