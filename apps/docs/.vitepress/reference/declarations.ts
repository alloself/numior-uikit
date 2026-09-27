import ts from 'typescript';
import type { DeclarationKind, DeclarationReference } from './reference.types.ts';

const kindOf = (declaration: ts.Declaration, type: string): DeclarationKind => {
  if (
    ts.isInterfaceDeclaration(declaration) ||
    ts.isTypeAliasDeclaration(declaration) ||
    ts.isEnumDeclaration(declaration)
  ) {
    return 'type';
  }
  return ts.isFunctionDeclaration(declaration) || type.includes('=>') ? 'function' : 'value';
};

const signatureOf = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declaration: ts.Declaration,
  kind: DeclarationKind,
): string =>
  kind === 'type'
    ? declaration
        .getText()
        .replace(/^export\s+(declare\s+)?/, '')
        .replaceAll(/^(?: {4})+/gm, (indent) => ' '.repeat(indent.length / 2))
    : `${symbol.name}: ${checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, declaration),
        declaration,
        ts.TypeFormatFlags.NoTruncation,
      )}`;

export const exportedDeclarations = (
  file: string,
  pkg: string,
  skip: ReadonlySet<string>,
): DeclarationReference[] => {
  const program = ts.createProgram([file], { skipLibCheck: true, noEmit: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const moduleSymbol = source === undefined ? undefined : checker.getSymbolAtLocation(source);

  if (moduleSymbol === undefined) {
    return [];
  }
  return checker.getExportsOfModule(moduleSymbol).flatMap((exported) => {
    if (skip.has(exported.name)) {
      return [];
    }

    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;

    const declaration = symbol.declarations?.[0];

    if (declaration === undefined) {
      return [];
    }
    const type = checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, declaration));
    const kind = kindOf(declaration, type);

    return [
      {
        name: exported.name,
        package: pkg,
        kind,
        signature: signatureOf(checker, symbol, declaration, kind),
      },
    ];
  });
};
