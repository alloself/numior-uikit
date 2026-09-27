import type { MarkdownRenderer } from 'vitepress';
import { isEnglishPage } from './env';

const ALERT_TONES = { tip: 'success', info: 'info', warning: 'warning', danger: 'error' } as const;

const detailsLabel = (env: unknown): string => (isEnglishPage(env) ? 'Details' : 'Подробнее');

const titleOf = (info: string, name: string): string => info.trim().slice(name.length).trim();

export const alertContainers = (md: MarkdownRenderer): void => {
  for (const [name, tone] of Object.entries(ALERT_TONES)) {
    md.renderer.rules[`container_${name}_open`] = (tokens, idx) => {
      const title = titleOf(tokens[idx]?.info ?? '', name);
      const titleAttr = title === '' ? '' : ` title="${md.utils.escapeHtml(title)}"`;

      return `<NuiAlert tone="${tone}"${titleAttr}>\n`;
    };

    md.renderer.rules[`container_${name}_close`] = () => '</NuiAlert>\n';
  }

  md.renderer.rules.container_details_open = (tokens, idx, _options, env) => {
    const title = titleOf(tokens[idx]?.info ?? '', 'details') || detailsLabel(env);

    return `<NuiCollapsible variant="card" label="${md.utils.escapeHtml(title)}">\n`;
  };

  md.renderer.rules.container_details_close = () => '</NuiCollapsible>\n';
};
