import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vite-plus/test';
import { colorSchemeScript } from '@numior/primitives';
import { ACCENT_STORAGE_KEY, accentScript } from '../.vitepress/theme/composables/use-accent';
import { topWindowOnly } from '../.vitepress/theme/frame-theme';

interface ScriptWindow {
  parent: unknown;
}

const STORED: Readonly<Record<string, string>> = {
  'nui-theme': 'dark',
  [ACCENT_STORAGE_KEY]: 'violet',
};

const SCRIPTS = [
  topWindowOnly(colorSchemeScript('nui-theme')),
  topWindowOnly(accentScript(ACCENT_STORAGE_KEY)),
];

const windowOf = (framed: boolean): ScriptWindow => {
  const view: ScriptWindow = { parent: undefined };

  view.parent = framed ? {} : view;

  return view;
};

const classesAfterHead = (framed: boolean): string[] => {
  const classes = new Set<string>();

  const classList = {
    add: (...names: string[]): void => {
      for (const name of names) {
        classes.add(name);
      }
    },
    remove: (...names: string[]): void => {
      for (const name of names) {
        classes.delete(name);
      }
    },
  };

  const context = {
    window: windowOf(framed),
    document: { documentElement: { classList } },
    localStorage: { getItem: (key: string): string | null => STORED[key] ?? null },
  };

  for (const script of SCRIPTS) {
    runInNewContext(script, context);
  }

  return [...classes];
};

describe('theme scripts in the head of a page', () => {
  it('give the page the stored scheme and accent', () => {
    expect(classesAfterHead(false)).toEqual(['nui-theme--dark', 'nui-theme--accent-violet']);
  });

  it('leave the theme of a framed page to the page around it', () => {
    expect(classesAfterHead(true)).toEqual([]);
  });
});
