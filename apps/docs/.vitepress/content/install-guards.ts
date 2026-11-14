import { installFormOf } from '../markdown/install.ts';
import { GuardRule, type GuardProblem } from './guard.types.ts';

const SECTION_RE = /^## /m;
const INSTALL_TITLE_RE = /^(?:Установка|Installation)\s*$/;
const FENCE_RE = /^(`{3,})([^\n`]*)\n([\s\S]*?)^\1[ \t]*$/gm;
const KIT_STYLE_RE = /^import\s+'@numior\/[^']+\.css';$/m;
const KIT_COMPONENT_RE = /import\s*\{[^}]*\bNui[A-Z]\w*[^}]*\}\s*from\s*'@numior\//;

const HAND_LISTED = 'an install block lists stylesheets by hand; the build prints them';

const LISTED_BESIDE =
  'stylesheets of kit components are listed by hand; mark the block `ts install`';

const UNLISTED = 'an install block imports kit components without `ts install`';

const fenceProblem = (info: string, code: string, installing: boolean): string | undefined => {
  const generated = installFormOf(info) !== undefined;
  const handListed = KIT_STYLE_RE.test(code);
  const components = KIT_COMPONENT_RE.test(code);

  if (generated) {
    return handListed ? HAND_LISTED : undefined;
  }
  if (components && handListed) {
    return LISTED_BESIDE;
  }
  return components && installing ? UNLISTED : undefined;
};

const sectionProblems = (section: string): string[] => {
  const installing = INSTALL_TITLE_RE.test(section.slice(0, section.indexOf('\n')));

  return [...section.matchAll(FENCE_RE)].flatMap(([, , info = '', code = '']) => {
    const problem = fenceProblem(info, code, installing);

    return problem === undefined ? [] : [problem];
  });
};

export const installGuards = (page: string, source: string): GuardProblem[] =>
  source
    .split(SECTION_RE)
    .flatMap(sectionProblems)
    .map((text) => ({ rule: GuardRule.Install, file: page, text }));
