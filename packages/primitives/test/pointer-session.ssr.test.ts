// @vitest-environment node
import { renderToString } from '@vue/test-utils';
import { describe, expect, it } from 'vite-plus/test';
import PointerSessionHost from './fixtures/PointerSessionHost.vue';
import { collectGarbage } from './support/collect-garbage';

const renderedPress = async (capture: boolean): Promise<WeakRef<object>> => {
  const handlers = { down: () => undefined };

  await renderToString(PointerSessionHost, { props: { handlers, capture } });

  return new WeakRef(handlers);
};

describe('usePointerSession on the server', () => {
  it.each([false, true])(
    'keeps nothing of a press begun while a page renders (capture %s)',
    async (capture) => {
      const press = await renderedPress(capture);

      await collectGarbage();

      expect(press.deref()).toBeUndefined();
    },
  );
});
