import type { MarkdownRenderer } from 'vitepress';
import type { Highlighter } from 'shiki';
import { codeGroups } from './code-group';
import { alertContainers } from './containers';
import { codeFence } from './fence';
import { componentLinks } from './links';
import { stepLists } from './steps';

export { CODE_LANGUAGES } from './languages';

export const docsMarkdown = (md: MarkdownRenderer, highlighter: Highlighter): void => {
  codeFence(md, highlighter);
  codeGroups(md, highlighter);
  componentLinks(md);
  alertContainers(md);
  stepLists(md);
};
