import { BASE_PACKAGES, installFormOf, packageOf } from '../markdown/install.ts';
import { GuardRule, type GuardProblem } from './guard.types.ts';

const SECTION_RE = /^## /m;
const INSTALL_TITLE_RE = /^(?:Установка|Installation)\s*$/;
const FENCE_RE = /^(`{3,})([^\n`]*)\n([\s\S]*?)^\1[ \t]*$/gm;
const KIT_STYLE_RE = /^import\s+'@numior\/[^']+\.css';$/m;
const STYLE_SOURCE_RE = /^@?import\s+'(@numior\/[^']+\.css)';$/gm;
const KIT_COMPONENT_RE = /import\s*\{[^}]*\bNui[A-Z]\w*[^}]*\}\s*from\s*'@numior\//;
const COMMAND_RE = /^(?:pnpm add|npm install|yarn add|bun add)\b(.*)$/gm;
const KIT_PACKAGE_RE = /@numior\/[\w-]+/g;

const HAND_LISTED = 'an install block lists stylesheets by hand; the build prints them';

const LISTED_BESIDE =
  'stylesheets of kit components are listed by hand; mark the block `ts install`';

const UNLISTED = 'an install block imports kit components without `ts install`';

const MODULE_LISTED =
  'stylesheets of a kit module are listed by hand; mark the block `ts install:packages`';

const MODULE_COMMAND =
  'an install command of a kit module is written by hand; the `ts install:packages` block prints it';

const isModule = (name: string, styled: ReadonlySet<string>): boolean =>
  styled.has(name) && !BASE_PACKAGES.has(name);

const listsModuleStyles = (code: string, styled: ReadonlySet<string>): boolean =>
  [...code.matchAll(STYLE_SOURCE_RE)].some(([, path = '']) => isModule(packageOf(path), styled));

const installsModule = (code: string, styled: ReadonlySet<string>): boolean =>
  [...code.matchAll(COMMAND_RE)].some(([, names = '']) =>
    (names.match(KIT_PACKAGE_RE) ?? []).some((name) => isModule(name, styled)),
  );

const handProblem = (code: string, styled: ReadonlySet<string>): string | undefined => {
  if (installsModule(code, styled)) {
    return MODULE_COMMAND;
  }
  return listsModuleStyles(code, styled) ? MODULE_LISTED : undefined;
};

const fenceProblem = (
  info: string,
  code: string,
  installing: boolean,
  styled: ReadonlySet<string>,
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
  return handProblem(code, styled);
};

const sectionProblems = (section: string, styled: ReadonlySet<string>): string[] => {
  const installing = INSTALL_TITLE_RE.test(section.slice(0, section.indexOf('\n')));

  return [...section.matchAll(FENCE_RE)].flatMap(([, , info = '', code = '']) => {
    const problem = fenceProblem(info, code, installing, styled);

    return problem === undefined ? [] : [problem];
  });
};

export const installGuards = (
  page: string,
  source: string,
  styled: ReadonlySet<string>,
): GuardProblem[] =>
  source
    .split(SECTION_RE)
    .flatMap((section) => sectionProblems(section, styled))
    .map((text) => ({ rule: GuardRule.Install, file: page, text }));
