import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { spreadArguments } from './spread-arguments.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const reported = (name, hint) => ({ messageId: 'spread', data: { name, hint } });

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

tester.run('spread-arguments', spreadArguments, {
  valid: [
    `for (const entry of found) {
  list.push(entry);
}`,
    `const all = [...first, ...second];`,
    `const top = max(values) ?? 0;`,
    `const span = Math.max(first, second);`,
    `pieces.push(String.fromCharCode(...bytes.subarray(at, at + SIZE)));`,
    `const forwarded = (...parts: string[]) => join(...parts);`,
    `list.push({ ...entry, key });`,
  ],
  invalid: [
    {
      code: `list.push(...found);`,
      errors: [reported('push', 'push the entries in a for…of loop')],
    },
    {
      code: `list.push(first, ...rest.map(read), last);`,
      errors: [reported('push', 'push the entries in a for…of loop')],
    },
    {
      code: `later.unshift(...changesOf(part));`,
      errors: [reported('unshift', 'build the list with an array literal')],
    },
    {
      code: `order.splice(0, order.length, ...next);`,
      errors: [reported('splice', 'build the list with an array literal')],
    },
    {
      code: `const extent = [Math.min(...values), Math.max(0, ...values)];`,
      errors: [
        reported('Math.min', 'use min or minBy of lodash-es'),
        reported('Math.max', 'use max or maxBy of lodash-es'),
      ],
    },
    {
      code: `const text = String.fromCharCode(...bytes);`,
      errors: [reported('String.fromCharCode', 'decode a bounded subarray per call')],
    },
    {
      code: `const text = String.fromCodePoint(...points.slice(from));`,
      errors: [reported('String.fromCodePoint', 'decode a bounded slice per call')],
    },
  ],
});
