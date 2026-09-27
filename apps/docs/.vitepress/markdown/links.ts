import type { MarkdownRenderer } from 'vitepress';

const EXTERNAL_RE = /^(?:[a-z]+:)?\/\//i;

export const componentLinks = (md: MarkdownRenderer): void => {
  md.renderer.rules.link_open = (tokens, idx) => {
    const token = tokens[idx];
    const href = token?.attrGet('href') ?? '';
    const title = token?.attrGet('title');
    const external = token?.attrGet('target') === '_blank' || EXTERNAL_RE.test(href);
    const titleAttr = title ? ` title="${md.utils.escapeHtml(title)}"` : '';

    return `<NuiLink href="${md.utils.escapeHtml(href)}"${external ? ' external' : ''}${titleAttr}>`;
  };

  md.renderer.rules.link_close = () => '</NuiLink>';
};
