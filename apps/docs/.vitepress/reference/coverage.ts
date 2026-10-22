import type { DeclarationReference } from './reference.types.ts';

const SIGNATURE_RE = /<SignatureReference\s+(?:name="([^"]+)"|:names="\[([^\]]+)\]")/g;

const EXTRA_COMPOSABLES: ReadonlySet<string> = new Set([
  'createNuiConfig',
  'provideNuiConfig',
  'plural',
  'lazyIcon',
  'colorSchemeScript',
]);

export const signatureNamesOf = (source: string): string[] =>
  [...source.matchAll(SIGNATURE_RE)].flatMap(([, single, list]) =>
    single === undefined
      ? (list ?? '').split(',').map((entry) => entry.trim().replaceAll(/^['"]|['"]$/g, ''))
      : [single],
  );

const isComposable = (declaration: DeclarationReference): boolean =>
  declaration.kind === 'function' &&
  (declaration.name.startsWith('use') || EXTRA_COMPOSABLES.has(declaration.name));

export const composableCoverage = (
  declarations: readonly DeclarationReference[],
  pages: Readonly<Record<string, string>>,
): string[] => {
  const covered = { ru: new Set<string>(), en: new Set<string>() };

  for (const [page, source] of Object.entries(pages)) {
    const locale = page.startsWith('en/') ? 'en' : 'ru';

    for (const name of signatureNamesOf(source)) {
      covered[locale].add(name);
    }
  }
  return declarations.reduce<string[]>((found, declaration) => {
    if (!isComposable(declaration)) {
      return found;
    }

    const missing = (['ru', 'en'] as const).filter(
      (locale) => !covered[locale].has(declaration.name),
    );

    if (missing.length > 0) {
      found.push(`${declaration.name}: no <SignatureReference> on a ${missing.join(' and ')} page`);
    }
    return found;
  }, []);
};
