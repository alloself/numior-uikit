import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { pageListeners } from './page-listeners.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

const error = { messageId: 'held' };

tester.run('page-listeners', pageListeners, {
  valid: [
    `export const useDrag = () => {
  const finish = () => {
    window.removeEventListener('pointermove', follow);
  };

  onScopeDispose(finish);

  return () => {
    window.addEventListener('pointermove', follow);
  };
};`,
    `export const useKeys = () => {
  document.addEventListener('keydown', onKeydown);
  tryOnScopeDispose(() => {
    document.removeEventListener('keydown', onKeydown);
  });
};`,
    `export const useField = (field) => {
  field.addEventListener('input', onInput);
};`,
    `export const usePage = () => {
  useEventListener(window, 'resize', measure);
};`,
  ],
  invalid: [
    {
      code: `export const useDrag = () => {
  const finish = () => {
    window.removeEventListener('pointermove', follow);
    window.removeEventListener('pointerup', finish);
  };

  return () => {
    window.addEventListener('pointermove', follow);
    window.addEventListener('pointerup', finish);
  };
};`,
      errors: [error, error],
    },
    {
      code: `export const afterRelease = (action) => {
  globalThis.addEventListener('pointerup', action, true);
};`,
      errors: [error],
    },
    {
      code: `export const watchKeys = () => {
  document.addEventListener('keydown', onKeydown);
};`,
      errors: [error],
    },
  ],
});
