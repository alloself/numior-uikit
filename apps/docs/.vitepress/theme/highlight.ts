import { onMounted, ref, watch, type MaybeRefOrGetter, toValue, type Ref } from 'vue';
import type { Highlighter } from 'shiki';
import type { NuiCodeLine } from '@numior/vue';
import { tokenizeCode } from '../markdown/tokens';

let pending: Promise<Highlighter> | undefined;

const highlighterOf = (): Promise<Highlighter> => {
  pending ??= import('shiki').then((shiki) =>
    shiki.createHighlighter({ themes: ['github-light'], langs: ['vue', 'vue-html'] }),
  );

  return pending;
};

export const useVueTokens = (code: MaybeRefOrGetter<string>): Ref<NuiCodeLine[] | undefined> => {
  const tokens = ref<NuiCodeLine[] | undefined>(undefined);
  const highlighter = ref<Highlighter | undefined>(undefined);

  onMounted(async () => {
    highlighter.value = await highlighterOf();
  });

  watch(
    [highlighter, () => toValue(code)],
    ([current, source]) => {
      tokens.value = current === undefined ? undefined : tokenizeCode(current, source, 'vue');
    },
    { immediate: true },
  );

  return tokens;
};
