import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { pointerListeners } from './pointer-listeners.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

tester.run('pointer-listeners', pointerListeners, {
  valid: [
    `const pointer = usePointerSession();
const start = () => {
  pointer.begin({ move: follow, up: pointer.end });
};`,
    `useEventListener(root, 'pointerdown', onPointerdown);`,
    `useEventListener(() => layer.value?.closest('.editor'), 'pointerup', onPointerup);`,
    `useEventListener(() => (open.value ? document : undefined), 'keydown', onKeydown);`,
    `window.addEventListener('keydown', onKeydown);`,
    `element.addEventListener('dblclick', reset);`,
  ],
  invalid: [
    {
      code: `const start = () => {
  window.addEventListener('pointermove', follow);
};`,
      errors: [{ messageId: 'added' }],
    },
    {
      code: `grip.addEventListener('pointerup', commit);`,
      errors: [{ messageId: 'added' }],
    },
    {
      code: `field.addEventListener('wheel', onWheel, { passive: false });`,
      errors: [{ messageId: 'added' }],
    },
    {
      code: `useEventListener(() => (open.value ? document : undefined), 'pointerdown', onPage, { capture: true });`,
      errors: [{ messageId: 'toggled' }],
    },
    {
      code: `useEventListener(() => (held.value ? window : undefined), ['pointermove', 'pointerup'], follow);`,
      errors: [{ messageId: 'toggled' }],
    },
  ],
});
