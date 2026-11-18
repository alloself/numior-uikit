import { GuardRule, type GuardProblem } from './guard.types.ts';

const FENCE_RE = /^(`{3,})([^\n`]*)\n([\s\S]*?)^\1[ \t]*$/gm;

const COMPONENT_STYLES_RE =
  /^@?import\s+(?:url\()?'@numior\/kit\/(?:[a-z-]+\/)*styles(?:\/[^']+)?\.css'/m;

const SCRIPT_IMPORT_RE = /^\s*import\s+['"]@numior\/kit\/[^'"]*\.css['"]/m;
const STYLE_BLOCK_IMPORT_RE = /^\s*@import\s+(?:url\()?['"]@numior\/kit\/[^'"]*\.css['"]/m;
const VUE_INFO = /^vue\b/;

const WHOLE_KIT = "'@numior/kit/styles.css'";

const LISTED =
  'a code block imports the styles of components or a module; @numior/kit/styles.css brings them';

const OUTSIDE_ENTRY =
  'a code block imports kit CSS from a script or a component style block; it belongs in the Tailwind entry';

const listsComponentStyles = (code: string): boolean =>
  code.split('\n').some((line) => COMPONENT_STYLES_RE.test(line) && !line.includes(WHOLE_KIT));

const importsOutsideEntry = (info: string, code: string): boolean =>
  SCRIPT_IMPORT_RE.test(code) || (VUE_INFO.test(info.trim()) && STYLE_BLOCK_IMPORT_RE.test(code));

const fenceProblems = (info: string, code: string): string[] => [
  ...(listsComponentStyles(code) ? [LISTED] : []),
  ...(importsOutsideEntry(info, code) ? [OUTSIDE_ENTRY] : []),
];

export const styleGuards = (page: string, source: string): GuardProblem[] =>
  [...source.matchAll(FENCE_RE)].flatMap(([, , info = '', code = '']) =>
    fenceProblems(info, code).map((text) => ({ rule: GuardRule.Styles, file: page, text })),
  );
