import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { versionReads } from './version-reads.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

const touched = { messageId: 'touched' };

const compared = { messageId: 'compared' };

tester.run('version-reads', versionReads, {
  valid: [
    'const shown = computed(() => version.read(() => engine.count()));',
    'const stamp = revision.stamp;',
    'void save();',
    'void options.pullTotals();',
    'const at = index.value >= 0 ? index.value : undefined;',
    'const fits = count() > 0;',
    'const left = revision.stamp - 1;',
  ],
  invalid: [
    { code: 'void revision.value;', errors: [touched] },
    { code: 'void revision;', errors: [touched] },
    { code: 'void options.revision.value;', errors: [touched] },
    { code: 'void options.arrangement();', errors: [touched] },
    { code: 'void shown.value;', errors: [touched] },
    {
      code: 'const list = computed(() => (sheetsRevision.value >= 0 ? [...book.sheets] : []));',
      errors: [compared],
    },
    { code: 'const empty = options.revision() < 0;', errors: [compared] },
    { code: 'const ready = 0 <= editing.revision.value;', errors: [compared] },
    { code: 'const fresh = version.stamp >= 0;', errors: [compared] },
  ],
});
