import {
  DiagnosticCode,
  DiagnosticSeverity,
  type CheckTexts,
  type Diagnostic,
  type Position,
  type StylePlace,
} from './check.types';
import { diagnosticAt } from './diagnostic';

const KIT_STYLESHEET = /^~?@numior\/[^?#]*\.css$/u;

export const isKitStylesheet = (path: string): boolean => KIT_STYLESHEET.test(path);

export const misplacedStyles = (
  texts: CheckTexts,
  at: Position,
  path: string,
  place: StylePlace,
): Diagnostic =>
  diagnosticAt(
    at,
    DiagnosticSeverity.Warning,
    DiagnosticCode.MisplacedStyles,
    texts.misplacedStyles(path, place),
  );
