import { uniq } from 'lodash-es';
import { GuardRule, type GuardProblem } from './guard.types.ts';

const INTERNAL_RE = /@numior\/(?!kit\b|mcp\b)[a-z][a-z-]*/gu;
const IMPORT_RE = /^import\s[^;]*?from\s+'[^']+';$/gmu;

export const packageGuards = (file: string, source: string): GuardProblem[] =>
  uniq(source.match(INTERNAL_RE) ?? []).map((name) => ({
    rule: GuardRule.Imports,
    file,
    text: `${name} is a package inside the kit; the docs name @numior/kit`,
  }));

export const catalogPackageGuards = (file: string, source: string): GuardProblem[] =>
  packageGuards(file, source.replace(IMPORT_RE, ''));
