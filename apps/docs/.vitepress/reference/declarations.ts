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

const DERIVED_TYPE = /\btypeof\b/;

const typeText = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declaration: ts.Declaration,
): string =>
  ts.isTypeAliasDeclaration(declaration) && DERIVED_TYPE.test(declaration.type.getText())
    ? `type ${symbol.name} = ${checker.typeToString(
        checker.getDeclaredTypeOfSymbol(symbol),
        declaration,
        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
      )};`
    : declaration
        .getText()
        .replace(/^export\s+(declare\s+)?/, '')
        .replaceAll(/^(?: {4})+/gm, (indent) => ' '.repeat(indent.length / 2));

const signatureOf = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declaration: ts.Declaration,
  kind: DeclarationKind,
): string =>
  kind === 'type'
    ? typeText(checker, symbol, declaration)
    : `${symbol.name}: ${checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, declaration),
        declaration,
        ts.TypeFormatFlags.NoTruncation,
      )}`;

const exportsOf = (file: string): { checker: ts.TypeChecker; exports: readonly ts.Symbol[] } => {
  const program = ts.createProgram([file], { skipLibCheck: true, noEmit: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const moduleSymbol = source === undefined ? undefined : checker.getSymbolAtLocation(source);

  return {
    checker,
    exports: moduleSymbol === undefined ? [] : checker.getExportsOfModule(moduleSymbol),
  };
};

export const enumerationMembers = (file: string): ReadonlyMap<string, string> => {
  const { checker, exports } = exportsOf(file);
  const members = new Map<string, string>();

  for (const exported of exports) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;

    if (!(symbol.flags & ts.SymbolFlags.Variable)) {
      continue;
    }

    for (const member of checker.getTypeOfSymbol(symbol).getProperties()) {
      const value = checker.getTypeOfSymbol(member);

      if (!value.isStringLiteral()) {
        continue;
      }

      members.set(`${exported.name}.${member.name}`, JSON.stringify(value.value));
    }
  }
  return members;
};

export const exportedDeclarations = (
  file: string,
  pkg: string,
  skip: ReadonlySet<string>,
): DeclarationReference[] => {
  const { checker, exports } = exportsOf(file);

  return exports.flatMap((exported) => {
    if (skip.has(exported.name)) {
      return [];
    }

    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;

    const declaration =
      symbol.declarations?.find((candidate) => ts.isTypeAliasDeclaration(candidate)) ??
      symbol.declarations?.[0];

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
