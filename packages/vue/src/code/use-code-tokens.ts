import {
  highlightCode,
  useHighlighter,
  type NuiCodeTokens,
  type NuiHighlighter,
} from '@numior/primitives';
import { onMounted, shallowRef, watch, type ShallowRef } from 'vue';

export interface CodeSource {
  readonly code: string;
  readonly language: string | undefined;
  readonly highlighter: NuiHighlighter | false | undefined;
}

export const useCodeTokens = (source: () => CodeSource): ShallowRef<NuiCodeTokens> => {
  const configured = useHighlighter();
  const tokens = shallowRef<NuiCodeTokens>(undefined);
  let revision = 0;

  const settle = async (pending: Promise<NuiCodeTokens>, current: number): Promise<void> => {
    const next = await pending;

    if (current === revision) {
      tokens.value = next;
    }
  };

  const run = ({ code, language, highlighter }: CodeSource): void => {
    const active = highlighter === false ? null : (highlighter ?? configured);
    const current = revision + 1;

    revision = current;
    if (active === null) {
      tokens.value = undefined;
      return;
    }

    const result = highlightCode(active, code, language);

    if (result instanceof Promise) {
      void settle(result, current);
    } else {
      tokens.value = result;
    }
  };

  onMounted(() => {
    watch(source, run, { immediate: true });
  });

  return tokens;
};
