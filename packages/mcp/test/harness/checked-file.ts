import { checkUsage } from '../../src/check/check-usage';
import type { CheckInput, Diagnostic, DiagnosticCode } from '../../src/check/check.types';
import type { McpData } from '../../src/data.types';
import { fixtureData } from '../fixtures/data';

type CheckOptions = Partial<Omit<CheckInput, 'code'>>;

export class CheckedFile {
  private constructor(readonly diagnostics: readonly Diagnostic[]) {}

  static of(code: string, options: CheckOptions = {}, data: McpData = fixtureData): CheckedFile {
    const report = checkUsage(data, { locale: 'en', ...options, code });

    return new CheckedFile(report.diagnostics);
  }

  get codes(): DiagnosticCode[] {
    return this.diagnostics.map((diagnostic) => diagnostic.code);
  }

  get lines(): number[] {
    return this.diagnostics.map((diagnostic) => diagnostic.line);
  }

  get messages(): string[] {
    return this.diagnostics.map((diagnostic) => diagnostic.message);
  }

  get hints(): string[] {
    return this.diagnostics.map((diagnostic) => diagnostic.hint);
  }

  get severities(): string[] {
    return this.diagnostics.map((diagnostic) => diagnostic.severity);
  }
}
