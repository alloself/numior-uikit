import type { MarkdownRenderer } from 'vitepress';
import type { Highlighter } from 'shiki';
import { codeGroups } from './code-group';
import { alertContainers } from './containers';
import { codeFence } from './fence';
import { installBlocks } from './install';
import { componentLinks } from './links';
import type { InstallSource } from './markdown.types';

export { CODE_LANGUAGES } from './languages';

export const docsMarkdown = (
  md: MarkdownRenderer,
  highlighter: Highlighter,
  install: InstallSource | undefined,
): void => {
  codeFence(md, highlighter);
  installBlocks(md, install);
  codeGroups(md, highlighter);
  componentLinks(md);
  alertContainers(md);
};
