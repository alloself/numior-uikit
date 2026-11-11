import type { NuiEditorApi } from '@numior/editor-vue';
import { useMounted } from '@vueuse/core';
import { watch } from 'vue';

export const useEditorLayout = (
  editor: () => NuiEditorApi | undefined,
  place: () => void,
): void => {
  const mounted = useMounted();

  watch(
    [editor, mounted],
    ([api, ready], _before, onCleanup) => {
      if (api === undefined || !ready) {
        return;
      }

      onCleanup(api.watchLayout(place));
    },
    { immediate: true },
  );
};
