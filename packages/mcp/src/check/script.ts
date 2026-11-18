import { babelParse, type SFCScriptBlock } from '@vue/compiler-sfc';
import type { McpData } from '../data.types';
import { nearest } from '../nearest';
import {
  DiagnosticCode,
  DiagnosticSeverity,
  StylePlace,
  type CheckTexts,
  type Diagnostic,
  type NamedImport,
  type ScriptFacts,
} from './check.types';
import { diagnosticAt } from './diagnostic';
import { isKitStylesheet, misplacedStyles } from './misplaced-styles';

const KIT_SOURCE = /^@numior\//u;
const DEFAULT_IMPORT = 'default';
const NAMESPACE_IMPORT = '*';
const TSX = 'tsx';
const JSX = 'jsx';

const programOf = (block: SFCScriptBlock) =>
  babelParse(block.content, {
    sourceType: 'module',
    plugins:
      block.lang === TSX ? ['typescript', 'jsx'] : block.lang === JSX ? ['jsx'] : ['typescript'],
  }).program;

const blockImports = (block: SFCScriptBlock): NamedImport[] =>
  programOf(block).body.flatMap((statement): NamedImport[] => {
    if (statement.type !== 'ImportDeclaration') {
      return [];
    }
    const source = statement.source.value;

    const position = {
      line: block.loc.start.line + (statement.loc?.start.line ?? 1) - 1,
      column: (statement.loc?.start.column ?? 0) + 1,
    };

    if (statement.specifiers.length === 0) {
      return [{ ...position, source, imported: undefined, local: '' }];
    }
    return statement.specifiers.map((specifier) => {
      if (specifier.type === 'ImportDefaultSpecifier') {
        return { ...position, source, imported: DEFAULT_IMPORT, local: specifier.local.name };
      }
      if (specifier.type === 'ImportNamespaceSpecifier') {
        return { ...position, source, imported: NAMESPACE_IMPORT, local: specifier.local.name };
      }

      const imported =
        specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : specifier.imported.value;

      return { ...position, source, imported, local: specifier.local.name };
    });
  });

const ownersOf = (data: McpData, name: string, source: string): string[] =>
  Object.entries(data.exports).reduce<string[]>((owners, [entry, names]) => {
    if (entry !== source && names.includes(name)) {
      owners.push(entry);
    }
    return owners;
  }, []);

const exportProblem = (
  data: McpData,
  texts: CheckTexts,
  entry: NamedImport,
): Diagnostic | undefined => {
  const names = data.exports[entry.source];
  const checkable = names !== undefined && entry.imported !== undefined;

  if (!checkable || entry.imported === NAMESPACE_IMPORT || names.includes(entry.imported)) {
    return undefined;
  }
  if (entry.imported === DEFAULT_IMPORT) {
    return diagnosticAt(
      entry,
      DiagnosticSeverity.Error,
      DiagnosticCode.UnknownExport,
      texts.noDefaultExport(entry.source),
    );
  }
  return diagnosticAt(
    entry,
    DiagnosticSeverity.Error,
    DiagnosticCode.UnknownExport,
    texts.unknownExport(entry.source, entry.imported, {
      nearest: nearest(entry.imported, names),
      owners: ownersOf(data, entry.imported, entry.source),
    }),
  );
};

const parseProblem = (texts: CheckTexts, block: SFCScriptBlock, error: unknown): Diagnostic =>
  diagnosticAt(
    { line: block.loc.start.line, column: 1 },
    DiagnosticSeverity.Error,
    DiagnosticCode.ParseError,
    texts.parseError(block.setup ? '<script setup>' : '<script>', String(error)),
  );

export const scriptFacts = (
  data: McpData,
  texts: CheckTexts,
  blocks: readonly SFCScriptBlock[],
): ScriptFacts =>
  blocks.reduce<{ imports: NamedImport[]; diagnostics: Diagnostic[] }>(
    (facts, block) => {
      try {
        for (const entry of blockImports(block)) {
          facts.imports.push(entry);

          const problem = isKitStylesheet(entry.source)
            ? misplacedStyles(texts, entry, entry.source, StylePlace.Script)
            : KIT_SOURCE.test(entry.source)
              ? exportProblem(data, texts, entry)
              : undefined;

          if (problem === undefined) {
            continue;
          }

          facts.diagnostics.push(problem);
        }
      } catch (error) {
        facts.diagnostics.push(parseProblem(texts, block, error));
      }
      return facts;
    },
    { imports: [], diagnostics: [] },
  );
