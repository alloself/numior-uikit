import type { HtmlElement, PasteSource } from './html.types';
import { normalizeGoogleDocs } from './normalize-google';
import { normalizeSheet } from './normalize-sheet';
import { normalizeWord } from './normalize-word';
import { nestLists, rewriteTree } from './rewrite';

const SIGNS: readonly (readonly [Exclude<PasteSource, 'html' | 'text'>, RegExp])[] = [
  ['own', /data-numior-editor/u],
  ['google-docs', /id="docs-internal-guid-/u],
  ['sheets', /<google-sheets-html-origin|data-sheets-root/u],
  ['excel', /ProgId content="?Excel\.Sheet|urn:schemas-microsoft-com:office:excel/iu],
  [
    'word',
    /ProgId content="?Word\.Document|urn:schemas-microsoft-com:office:word|class="?(?:Mso|TextRun|OutlineElement)/iu,
  ],
];

export const detectPasteSource = (html: string): PasteSource =>
  html.trim() === '' ? 'text' : (SIGNS.find(([, sign]) => sign.test(html))?.[0] ?? 'html');

const bySource = (root: HtmlElement, source: PasteSource): HtmlElement => {
  switch (source) {
    case 'word':
      return normalizeWord(root);
    case 'google-docs':
      return normalizeGoogleDocs(root);
    case 'excel':
    case 'sheets':
      return normalizeSheet(root);
    default:
      return root;
  }
};

export const normalizeSource = (root: HtmlElement, source: PasteSource): HtmlElement =>
  rewriteTree(bySource(root, source), nestLists);
