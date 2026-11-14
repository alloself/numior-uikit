import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  Finding,
  Position,
} from './check.types';

export const diagnosticAt = (
  position: Position,
  severity: DiagnosticSeverity,
  code: DiagnosticCode,
  finding: Finding,
): Diagnostic => ({
  line: position.line,
  column: position.column,
  severity,
  code,
  message: finding.message,
  hint: finding.hint,
});
