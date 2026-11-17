import type { MarkdownRenderer } from 'vitepress';
import type { Highlighter } from 'shiki';
import { attributeJson, fenceCode, fenceLabel } from './fence.ts';

const GROUP_OPEN = 'container_code-group_open';
const GROUP_CLOSE = 'container_code-group_close';
const GROUP = 'code_group';

export const codeGroups = (md: MarkdownRenderer, highlighter: Highlighter): void => {
  md.core.ruler.push(GROUP, (state) => {
    const tokens: typeof state.tokens = [];
    let fences: typeof state.tokens | undefined;

    for (const token of state.tokens) {
      if (token.type === GROUP_OPEN) {
        const group = new state.Token(GROUP, '', 0);

        fences = [];
        group.block = true;
        group.children = fences;
        tokens.push(group);
      } else if (token.type === GROUP_CLOSE) {
        fences = undefined;
      } else if (fences === undefined) {
        tokens.push(token);
      } else if (token.type === 'fence') {
        fences.push(token);
      }
    }

    state.tokens = tokens;
  });

  md.renderer.rules[GROUP] = (tokens, idx, _options, env) => {
    const items = (tokens[idx]?.children ?? []).map((fence) => ({
      label: fenceLabel(fence),
      code: fenceCode(highlighter, fence, env),
    }));

    return `<CodeGroup :items='${attributeJson(items)}'></CodeGroup>\n`;
  };
};
