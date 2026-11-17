import { installFormOf } from '../markdown/install.ts';
import { GuardRule, type GuardProblem } from './guard.types.ts';

const SECTION_RE = /^## /m;
const INSTALL_TITLE_RE = /^(?:Установка|Installation)\s*$/;
const FENCE_RE = /^(`{3,})([^\n`]*)\n([\s\S]*?)^\1[ \t]*$/gm;
const KIT_STYLE_RE = /^import\s+'@numior\/[^']+\.css';$/m;
const STYLE_SOURCE_RE = /^@?import\s+'(@numior\/[^']+\.css)';$/gm;
const KIT_COMPONENT_RE = /import\s*\{[^}]*\bNui[A-Z]\w*[^}]*\}\s*from\s*'@numior\//;

const HAND_LISTED = 'an install block lists stylesheets by hand; the build prints them';

const LISTED_BESIDE =
  'stylesheets of kit components are listed by hand; mark the block `ts install`';

const UNLISTED = 'an install block imports kit components without `ts install`';

const MODULE_LISTED =
  'stylesheets of a kit module are listed by hand; mark the block `ts install:packages`';

const listsModuleStyles = (code: string, modules: readonly string[]): boolean =>
  [...code.matchAll(STYLE_SOURCE_RE)].some(([, path = '']) =>
    modules.some((module) => path.startsWith(module)),
  );

const fenceProblem = (
  info: string,
  code: string,
  installing: boolean,
  modules: readonly string[],
): string | undefined => {
  const generated = installFormOf(info) !== undefined;
  const handListed = KIT_STYLE_RE.test(code);
  const components = KIT_COMPONENT_RE.test(code);

  if (generated) {
    return handListed ? HAND_LISTED : undefined;
  }
  if (components && handListed) {
    return LISTED_BESIDE;
  }
  if (components && installing) {
    return UNLISTED;
  }
  return listsModuleStyles(code, modules) ? MODULE_LISTED : undefined;
};

const sectionProblems = (section: string, modules: readonly string[]): string[] => {
  const installing = INSTALL_TITLE_RE.test(section.slice(0, section.indexOf('\n')));

  return [...section.matchAll(FENCE_RE)].flatMap(([, , info = '', code = '']) => {
    const problem = fenceProblem(info, code, installing, modules);

    return problem === undefined ? [] : [problem];
  });
};

export const installGuards = (
  page: string,
  source: string,
  modules: readonly string[],
): GuardProblem[] =>
  source
    .split(SECTION_RE)
    .flatMap((section) => sectionProblems(section, modules))
    .map((text) => ({ rule: GuardRule.Install, file: page, text }));
