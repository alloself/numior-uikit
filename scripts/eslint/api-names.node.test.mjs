import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vite-plus/test';
import { apiNames } from './api-names.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

tester.run('api-names', apiNames, {
  valid: [
    `export interface NuiAlertProps {
  closable?: boolean | undefined;
  closeLabel?: string | undefined;
  tone?: NuiTone | undefined;
}`,
    `interface Row {
  color: string;
  visible: boolean;
}`,
    `const emit = defineEmits<{ close: []; select: [value: string]; remove: [] }>();`,
    `export interface SheetFileOptions {
  readonly opened: (file: File) => void;
  readonly closable?: boolean | undefined;
}`,
    `export interface NuiTableEvents<T> {
  pick: [range: NuiTableRange];
  rowClick: [row: T];
}`,
    `const open = defineModel<boolean>('open', { default: false });`,
    `const values = defineModel<T[]>('values', { default: () => [] });`,
    `const model = defineModel<string>({ default: '' });`,
  ],
  invalid: [
    {
      code: `export interface NuiAlertProps {
  dismissible?: boolean | undefined;
  dismissLabel?: string | undefined;
}`,
      errors: [
        { messageId: 'prop', data: { name: 'dismissible', wanted: 'closable' } },
        { messageId: 'prop', data: { name: 'dismissLabel', wanted: 'closeLabel' } },
      ],
    },
    {
      code: `interface Props {
  readonly color?: string;
  'isOpen': boolean;
}`,
      errors: [
        { messageId: 'prop', data: { name: 'color', wanted: 'tone' } },
        { messageId: 'prop', data: { name: 'isOpen', wanted: 'open' } },
      ],
    },
    {
      code: `const emit = defineEmits<{ dismiss: []; choose: [value: string] }>();`,
      errors: [
        { messageId: 'event', data: { name: 'dismiss', wanted: 'close' } },
        { messageId: 'event', data: { name: 'choose', wanted: 'select' } },
      ],
    },
    {
      code: `export interface ToastOptions {
  readonly dismissible?: boolean | undefined;
}
export interface NuiMenuEvents {
  dismiss: [];
}`,
      errors: [
        { messageId: 'prop', data: { name: 'dismissible', wanted: 'closable' } },
        { messageId: 'event', data: { name: 'dismiss', wanted: 'close' } },
      ],
    },
    {
      code: `const shown = defineModel<boolean>('visible', { default: false });`,
      errors: [{ messageId: 'model', data: { name: 'visible', wanted: 'open' } }],
    },
  ],
});
