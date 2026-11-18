import type { MarkdownRenderer } from 'vitepress';
import { bundleOf, orderedStylesheets, styleImportOf } from '../reference/stylesheet-paths.ts';
import {
  InstallForm,
  type CoreState,
  type CoreToken,
  type InstallPlan,
  type InstallSource,
} from './markdown.types.ts';

const INSTALL_RULE = 'install_styles';
const STYLES_LANGUAGE = 'css';
const INSTALL_RE = /(?:^|\s)install(?::(packages))?(?=\s|$)/;
const KIT_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*'@numior\/[^']+';/g;
const FENCE_RE = /^(`{3,})([^\n`]*)\n([\s\S]*?)^\1[ \t]*$/gm;
const TYPE_PREFIX_RE = /^type\s+/;
const ALIAS_RE = /\s+as\s+\w+$/;

export const installFormOf = (info: string): InstallForm | undefined => {
  const match = INSTALL_RE.exec(info);

  if (match === null) {
    return undefined;
  }
  return match[1] === undefined ? InstallForm.Files : InstallForm.Packages;
};

const withoutInstall = (info: string): string => info.replace(INSTALL_RE, '').trim();

const importedNames = (code: string): string[] =>
  [...code.matchAll(KIT_IMPORT_RE)].flatMap(([, list = '']) =>
    list.split(',').reduce<string[]>((names, raw) => {
      const name = raw.trim().replace(ALIAS_RE, '');

      if (name !== '' && !TYPE_PREFIX_RE.test(name)) {
        names.push(name);
      }
      return names;
    }, []),
  );

const installPlan = (
  code: string,
  form: InstallForm,
  source: InstallSource | undefined,
): InstallPlan => {
  if (source === undefined) {
    throw new Error('An install block needs the API reference: run pnpm docs:reference');
  }
  const sheets = importedNames(code).flatMap((name) => source.components[name]?.stylesheets ?? []);

  if (sheets.length === 0) {
    throw new Error(`An install block imports no kit component with styles:\n${code}`);
  }
  const paths = form === InstallForm.Packages ? sheets.map(bundleOf) : sheets;
  const ordered = orderedStylesheets(paths, source.stylesheets);

  return {
    code: `${code.trimEnd()}\n`,
    styles: `${ordered.map(styleImportOf).join('\n')}\n`,
  };
};

const stylesToken = (state: CoreState, styles: string, map: CoreToken['map']): CoreToken => {
  const fence = new state.Token('fence', 'code', 0);

  fence.info = STYLES_LANGUAGE;
  fence.content = styles;
  fence.markup = '```';
  fence.block = true;
  fence.map = map;
  return fence;
};

export const expandInstallFences = (markdown: string, source: InstallSource | undefined): string =>
  markdown.replace(FENCE_RE, (block: string, fence: string, info: string, code: string) => {
    const form = installFormOf(info);

    if (form === undefined) {
      return block;
    }
    const plan = installPlan(code, form, source);

    return [
      `${fence}${withoutInstall(info)}\n${plan.code}${fence}`,
      `${fence}${STYLES_LANGUAGE}\n${plan.styles}${fence}`,
    ].join('\n\n');
  });

export const installBlocks = (md: MarkdownRenderer, source: InstallSource | undefined): void => {
  md.core.ruler.push(INSTALL_RULE, (state) => {
    state.tokens = state.tokens.flatMap((token) => {
      const form = token.type === 'fence' ? installFormOf(token.info) : undefined;

      if (form === undefined) {
        return [token];
      }
      const plan = installPlan(token.content, form, source);

      token.content = plan.code;
      token.info = withoutInstall(token.info);
      return [token, stylesToken(state, plan.styles, token.map)];
    });
  });
};
