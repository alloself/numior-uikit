import { parse, type CompilerError, type SFCScriptBlock } from '@vue/compiler-sfc';
import { sortBy } from 'lodash-es';
import type { McpData } from '../data.types';
import { checkMessages } from './check.messages';
import {
  DiagnosticCode,
  DiagnosticSeverity,
  type CheckInput,
  type CheckReport,
  type CheckTexts,
  type Diagnostic,
  type Position,
} from './check.types';
import { diagnosticAt } from './diagnostic';
import { scriptFacts } from './script';
import { styleFacts } from './styles';
import { missingStyles } from './stylesheets';
import { templateFacts } from './template';

const DEFAULT_FILENAME = 'Component.vue';

const FILE_START: Position = { line: 1, column: 1 };

const locationOf = (error: CompilerError | SyntaxError): Position =>
  'loc' in error && error.loc !== undefined
    ? { line: error.loc.start.line, column: error.loc.start.column }
    : FILE_START;

const parseProblems = (
  texts: CheckTexts,
  errors: readonly (CompilerError | SyntaxError)[],
): Diagnostic[] =>
  errors.map((error) =>
    diagnosticAt(
      locationOf(error),
      DiagnosticSeverity.Error,
      DiagnosticCode.ParseError,
      texts.parseError('SFC', error.message),
    ),
  );

export const checkUsage = (data: McpData, input: CheckInput): CheckReport => {
  const texts = checkMessages[input.locale];

  const { descriptor, errors } = parse(input.code, {
    filename: input.filename ?? DEFAULT_FILENAME,
  });

  const scripts = [descriptor.script, descriptor.scriptSetup].filter(
    (block): block is SFCScriptBlock => block !== null,
  );

  const script = scriptFacts(data, texts, scripts);
  const template = templateFacts(data, texts, descriptor.template?.ast, script.imports);
  const styles = styleFacts(data, texts, descriptor.styles);

  return {
    file: input.filename,
    diagnostics: sortBy(
      [
        ...parseProblems(texts, errors),
        ...script.diagnostics,
        ...template.diagnostics,
        ...styles.diagnostics,
        ...missingStyles(data, texts, template.used, [
          ...script.stylesheets,
          ...styles.stylesheets,
        ]),
      ],
      ['line', 'column'],
    ),
  };
};
