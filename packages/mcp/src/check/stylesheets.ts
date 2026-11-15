import { maxBy } from 'lodash-es';
import type { McpData } from '../data.types';
import {
  DiagnosticCode,
  DiagnosticSeverity,
  type CheckTexts,
  type Diagnostic,
  type UsedComponent,
} from './check.types';
import { diagnosticAt } from './diagnostic';

const WEBPACK_PREFIX = /^~/u;

const bundleOf = (data: McpData, sheet: string): string | undefined => {
  const owner = maxBy(
    Object.keys(data.packageStyles).filter((name) => sheet.startsWith(`${name}/`)),
    (name) => name.length,
  );

  return owner === undefined ? undefined : data.packageStyles[owner];
};

const firstUses = (used: readonly UsedComponent[]): UsedComponent[] => [
  ...used
    .reduce(
      (found, use) => (found.has(use.component.name) ? found : found.set(use.component.name, use)),
      new Map<string, UsedComponent>(),
    )
    .values(),
];

export const missingStyles = (
  data: McpData,
  texts: CheckTexts,
  used: readonly UsedComponent[],
  stylesheets: readonly string[],
): Diagnostic[] => {
  const imported = new Set(stylesheets.map((sheet) => sheet.replace(WEBPACK_PREFIX, '')));

  return firstUses(used).flatMap((use) => {
    const missing = use.component.stylesheets.reduce<{ sheets: string[]; bundles: string[] }>(
      (found, sheet) => {
        const bundle = bundleOf(data, sheet);

        if (imported.has(sheet) || (bundle !== undefined && imported.has(bundle))) {
          return found;
        }
        found.sheets.push(sheet);
        if (bundle !== undefined && bundle !== sheet && !found.bundles.includes(bundle)) {
          found.bundles.push(bundle);
        }
        return found;
      },
      { sheets: [], bundles: [] },
    );

    return missing.sheets.length === 0
      ? []
      : [
          diagnosticAt(
            use,
            DiagnosticSeverity.Warning,
            DiagnosticCode.MissingStyles,
            texts.missingStyles(use.component.name, missing),
          ),
        ];
  });
};
