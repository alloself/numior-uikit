import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { parse } from '@vue/compiler-sfc';
import { escapeRegExp, groupBy, kebabCase, sortBy, uniq } from 'lodash-es';
import ts from 'typescript';
import { STYLES_KEY, kitPackages, recordOf, type KitPackage } from './kit-packages.ts';
import { orderedStylesheets } from './stylesheet-paths.ts';

interface KitSheet {
  readonly file: string;
  readonly path: string;
  readonly owner: KitPackage;
  readonly text: string;
}

interface ImportEdge {
  readonly specifier: string;
  readonly names: readonly string[];
  readonly whole: boolean;
}

interface ReExport {
  readonly specifier: string;
  readonly exported: string;
  readonly original: string;
}

interface ModuleInfo {
  readonly imports: readonly ImportEdge[];
  readonly reExports: readonly ReExport[];
  readonly stars: readonly string[];
  readonly locals: ReadonlySet<string>;
  readonly blocks: readonly string[];
}

interface ModuleDraft {
  readonly imports: ImportEdge[];
  readonly reExports: ReExport[];
  readonly stars: string[];
  readonly locals: Set<string>;
}

export interface KitStylesheets {
  readonly order: readonly string[];
  readonly of: (file: string) => string[];
}

const MODULE_SUFFIXES = ['', '.ts', '.vue', '/index.ts'];
const CSS_IMPORT_RE = /@import\s+'([^']+)';/g;
const BLOCK_RE = /(?<![\w-])nui-([a-z0-9]+(?:-[a-z0-9]+)*)/g;
const SOURCE_CONDITION = '@numior/source';
const SHEETS_KEY = './styles/*.css';
const NAME_PREFIX = 'Nui';

const posix = (path: string): string => path.split(sep).join('/');

const dependencyOrder = (packages: readonly KitPackage[]): KitPackage[] => {
  const byName = new Map(packages.map((entry) => [entry.name, entry]));
  const ordered: KitPackage[] = [];
  const visited = new Set<string>();

  const visit = (entry: KitPackage): void => {
    if (visited.has(entry.name)) {
      return;
    }
    visited.add(entry.name);
    for (const dependency of entry.dependencies) {
      const found = byName.get(dependency);

      if (found === undefined) {
        continue;
      }

      visit(found);
    }
    ordered.push(entry);
  };

  const dependents = (entry: KitPackage): number =>
    packages.reduce(
      (count, candidate) => (candidate.dependencies.includes(entry.name) ? count + 1 : count),
      0,
    );

  for (const entry of sortBy(packages, [(candidate) => -dependents(candidate), 'name'])) {
    visit(entry);
  }
  return ordered;
};

const sourceExport = (owner: KitPackage, key: string): string | undefined => {
  const target = owner.exports[key];

  if (typeof target === 'string') {
    return target;
  }
  const source = recordOf(target)[SOURCE_CONDITION];

  return typeof source === 'string' ? source : undefined;
};

const bundlePath = (owner: KitPackage): string => `${owner.name}/styles.css`;

const sheetPath = (owner: KitPackage, file: string): string => {
  const pattern = sourceExport(owner, SHEETS_KEY);

  if (pattern === undefined) {
    return bundlePath(owner);
  }
  const [head = '', ...rest] = pattern.split('*');

  const expression = new RegExp(
    `^${escapeRegExp(head)}(.+)${rest.map((part) => escapeRegExp(part)).join(String.raw`\1`)}$`,
  );

  const stem = expression.exec(`./${posix(relative(owner.dir, file))}`)?.[1];

  return stem === undefined ? bundlePath(owner) : `${owner.name}/styles/${stem}.css`;
};

const cssImports = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(CSS_IMPORT_RE)].map((match) =>
    join(dirname(file), match[1] ?? ''),
  );

const inlinedCss = (file: string): string =>
  [readFileSync(file, 'utf8'), ...cssImports(file).map(inlinedCss)].join('\n');

const packageSheets = (owner: KitPackage): KitSheet[] => {
  const entry = sourceExport(owner, STYLES_KEY);

  if (entry === undefined) {
    return [];
  }
  return cssImports(join(owner.dir, entry)).map((file) => ({
    file,
    path: sheetPath(owner, file),
    owner,
    text: inlinedCss(file),
  }));
};

const namedImports = (clause: ts.ImportClause): string[] => {
  const bindings = clause.namedBindings;

  if (bindings === undefined || !ts.isNamedImports(bindings)) {
    return [];
  }
  return bindings.elements.reduce<string[]>((names, element) => {
    if (!element.isTypeOnly) {
      names.push((element.propertyName ?? element.name).text);
    }
    return names;
  }, []);
};

const importEdge = (statement: ts.ImportDeclaration): ImportEdge | undefined => {
  const clause = statement.importClause;

  if (clause?.isTypeOnly === true || !ts.isStringLiteral(statement.moduleSpecifier)) {
    return undefined;
  }
  const specifier = statement.moduleSpecifier.text;

  const whole =
    clause === undefined ||
    clause.name !== undefined ||
    (clause.namedBindings !== undefined && ts.isNamespaceImport(clause.namedBindings));

  return { specifier, names: clause === undefined ? [] : namedImports(clause), whole };
};

const reExportsOf = (statement: ts.ExportDeclaration, specifier: string): ReExport[] => {
  const clause = statement.exportClause;

  if (clause === undefined || !ts.isNamedExports(clause)) {
    return [];
  }
  return clause.elements.reduce<ReExport[]>((found, element) => {
    if (!element.isTypeOnly) {
      found.push({
        specifier,
        exported: element.name.text,
        original: (element.propertyName ?? element.name).text,
      });
    }
    return found;
  }, []);
};

const isExported = (statement: ts.Statement): boolean =>
  ts.canHaveModifiers(statement) &&
  (ts.getModifiers(statement) ?? []).some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );

const declaredNames = (statement: ts.Statement): string[] => {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
    );
  }

  const named =
    ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
      ? statement.name
      : undefined;

  return named === undefined ? [] : [named.text];
};

const dynamicImports = (node: ts.Node, found: ImportEdge[]): ImportEdge[] => {
  const [argument] = ts.isCallExpression(node) ? node.arguments : [];

  const dynamic =
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    argument !== undefined &&
    ts.isStringLiteral(argument);

  if (dynamic) {
    found.push({ specifier: argument.text, names: [], whole: true });
  }

  ts.forEachChild(node, (child) => {
    dynamicImports(child, found);
  });

  return found;
};

const addLocalExports = (draft: ModuleDraft, statement: ts.ExportDeclaration): void => {
  for (const entry of reExportsOf(statement, '')) {
    draft.locals.add(entry.exported);
  }
};

const addExport = (draft: ModuleDraft, statement: ts.ExportDeclaration): void => {
  if (statement.isTypeOnly) {
    return;
  }
  const specifier = statement.moduleSpecifier;

  if (specifier === undefined) {
    addLocalExports(draft, statement);

    return;
  }
  if (!ts.isStringLiteral(specifier)) {
    return;
  }
  if (statement.exportClause === undefined) {
    draft.stars.push(specifier.text);

    return;
  }
  for (const entry of reExportsOf(statement, specifier.text)) {
    draft.reExports.push(entry);
  }
};

const addStatement = (draft: ModuleDraft, statement: ts.Statement): void => {
  if (ts.isImportDeclaration(statement)) {
    const edge = importEdge(statement);

    if (edge !== undefined) {
      draft.imports.push(edge);
    }
    return;
  }
  if (ts.isExportDeclaration(statement)) {
    addExport(draft, statement);

    return;
  }
  if (!isExported(statement)) {
    return;
  }
  for (const name of declaredNames(statement)) {
    draft.locals.add(name);
  }
};

const scriptOf = (file: string, source: string): { script: string; template: string } => {
  if (!file.endsWith('.vue')) {
    return { script: source, template: '' };
  }
  const { descriptor } = parse(source, { filename: file });

  return {
    script: [descriptor.script?.content ?? '', descriptor.scriptSetup?.content ?? ''].join('\n'),
    template: descriptor.template?.content ?? '',
  };
};

const readModule = (file: string): ModuleInfo => {
  const { script, template } = scriptOf(file, readFileSync(file, 'utf8'));
  const source = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const draft: ModuleDraft = { imports: [], reExports: [], stars: [], locals: new Set() };

  for (const statement of source.statements) {
    addStatement(draft, statement);
  }
  return {
    ...draft,
    imports: dynamicImports(source, draft.imports),
    blocks: uniq([...template.matchAll(BLOCK_RE)].map((match) => match[1] ?? '')),
  };
};

const firstFile = (base: string): string | undefined =>
  MODULE_SUFFIXES.map((suffix) => `${base}${suffix}`).find(
    (candidate) =>
      existsSync(candidate) && (candidate.endsWith('.ts') || candidate.endsWith('.vue')),
  );

const packageOf = (packages: readonly KitPackage[], specifier: string): KitPackage | undefined =>
  packages.find(
    (candidate) => specifier === candidate.name || specifier.startsWith(`${candidate.name}/`),
  );

const resolveBare = (packages: readonly KitPackage[], specifier: string): string | undefined => {
  const owner = packageOf(packages, specifier);

  if (owner === undefined) {
    return undefined;
  }
  const target = sourceExport(owner, `.${specifier.slice(owner.name.length)}`);

  return target === undefined ? undefined : firstFile(join(owner.dir, target));
};

const sfcFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);

    if (item.isDirectory()) {
      return sfcFiles(path);
    }
    return item.name.startsWith(NAME_PREFIX) && item.name.endsWith('.vue') ? [path] : [];
  });

const blockOwners = (packages: readonly KitPackage[]): ReadonlyMap<string, string> => {
  const files = packages.flatMap((owner) => (existsSync(owner.src) ? sfcFiles(owner.src) : []));

  const byBlock = groupBy(files, (file) =>
    kebabCase(basename(file, '.vue').slice(NAME_PREFIX.length)),
  );

  return new Map(
    Object.entries(byBlock).flatMap(([block, owners]) =>
      owners.length === 1 && owners[0] !== undefined ? [[block, owners[0]]] : [],
    ),
  );
};

const mentions = (sheet: KitSheet, blocks: readonly string[]): boolean =>
  blocks.some((block) =>
    new RegExp(String.raw`\.nui-${escapeRegExp(block)}(?![a-z0-9]|-[a-z0-9])`).test(sheet.text),
  );

const nearestSheets = (
  sheets: readonly KitSheet[],
  owner: KitPackage,
  file: string,
): KitSheet[] => {
  for (let dir = dirname(file); dir.startsWith(owner.src); dir = dirname(dir)) {
    const here = sheets.filter((sheet) => sheet.owner === owner && dirname(sheet.file) === dir);

    if (here.length > 0) {
      return here;
    }
  }
  return [];
};

const pickSheets = (
  near: readonly KitSheet[],
  candidates: readonly KitSheet[],
  blocks: readonly string[],
): KitSheet[] => {
  const mentioned = candidates.filter((sheet) => mentions(sheet, blocks));
  const wholeDirectory = near.length === 1 || (near.length > 1 && mentioned.length === 0);

  return wholeDirectory ? [...near] : mentioned;
};

export const kitStylesheets = (root: string): KitStylesheets => {
  const packages = dependencyOrder(kitPackages(root));
  const sheets = packages.flatMap(packageSheets);

  const byOwner = groupBy(sheets, (sheet) => sheet.owner.name);

  const order = uniq(
    packages.flatMap((owner) => {
      const own = byOwner[owner.name] ?? [];

      return own.length === 0 ? [] : [bundlePath(owner), ...own.map((sheet) => sheet.path)];
    }),
  );

  const owners = blockOwners(packages);
  const modules = new Map<string, ModuleInfo>();

  const moduleOf = (file: string): ModuleInfo => {
    const known = modules.get(file);

    if (known !== undefined) {
      return known;
    }
    const info = readModule(file);

    modules.set(file, info);
    return info;
  };

  const resolve = (from: string, specifier: string): string | undefined =>
    specifier.startsWith('.')
      ? firstFile(join(dirname(from), specifier))
      : resolveBare(packages, specifier);

  const exportOf = (file: string, name: string, seen: ReadonlySet<string>): string | undefined => {
    if (file.endsWith('.vue') || moduleOf(file).locals.has(name)) {
      return file;
    }
    if (seen.has(file)) {
      return undefined;
    }
    const next = new Set([...seen, file]);
    const named = moduleOf(file).reExports.find((entry) => entry.exported === name);
    const target = named === undefined ? undefined : resolve(file, named.specifier);

    if (named !== undefined) {
      return target === undefined || named.original === 'default'
        ? target
        : exportOf(target, named.original, next);
    }
    return moduleOf(file)
      .stars.map((specifier) => resolve(file, specifier))
      .reduce<string | undefined>(
        (found, star) => found ?? (star === undefined ? undefined : exportOf(star, name, next)),
        undefined,
      );
  };

  const importTargets = (file: string, edge: ImportEdge): string[] => {
    const target = resolve(file, edge.specifier);

    if (target === undefined) {
      return [];
    }
    const named = edge.names.flatMap((name) => exportOf(target, name, new Set()) ?? []);

    return edge.whole ? [target, ...named] : named;
  };

  const edgesOf = (file: string): string[] => {
    const info = moduleOf(file);
    const exported = [...info.reExports.map((entry) => entry.specifier), ...info.stars];

    return uniq([
      ...info.imports.flatMap((edge) => importTargets(file, edge)),
      ...exported.flatMap((specifier) => resolve(file, specifier) ?? []),
    ]);
  };

  const closure = (file: string): string[] => {
    const visited = new Set<string>();
    const ordered: string[] = [];

    const visit = (current: string): void => {
      if (visited.has(current)) {
        return;
      }
      visited.add(current);
      for (const next of edgesOf(current)) {
        visit(next);
      }
      ordered.push(current);
    };

    visit(file);
    return ordered;
  };

  const ownSheets = (file: string): KitSheet[] => {
    const owner = packages.find((candidate) => file.startsWith(`${candidate.src}${sep}`));

    if (owner === undefined || !file.endsWith('.vue')) {
      return [];
    }
    const near = nearestSheets(sheets, owner, file);
    const candidates = near.length > 0 ? near : sheets.filter((sheet) => sheet.owner === owner);

    return pickSheets(near, candidates, moduleOf(file).blocks);
  };

  const borrowedSheets = (file: string): KitSheet[] =>
    moduleOf(file).blocks.flatMap((block) => {
      const owner = owners.get(block);

      return owner === undefined || dirname(owner) === dirname(file) ? [] : ownSheets(owner);
    });

  const of = (file: string): string[] =>
    orderedStylesheets(
      uniq(
        closure(file).flatMap((current) =>
          [...ownSheets(current), ...borrowedSheets(current)].map((sheet) => sheet.path),
        ),
      ),
      order,
    );

  return { order, of };
};
