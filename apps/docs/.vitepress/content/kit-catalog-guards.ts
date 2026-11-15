import ts from 'typescript';
import { GuardRule, type GuardProblem } from './guard.types.ts';
import { termProblems } from './page-guards.ts';
import { GLOSSARY } from './terms.ts';

const IDENTIFIER_RE = /^[a-z][\w-]*$/;

const literalsOf = (node: ts.Node): string[] => {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return [];
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [node.text];
  }
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
    return [node.text];
  }
  return node.getChildren().flatMap(literalsOf);
};

export const kitCatalogGuards = (file: string, source: string): GuardProblem[] => {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);

  return literalsOf(sourceFile).flatMap((text) =>
    IDENTIFIER_RE.test(text)
      ? []
      : termProblems(text, 'en', GLOSSARY).map((found) => ({
          rule: GuardRule.Glossary,
          file,
          text: found,
        })),
  );
};
