import { moveCurrent } from '../commands/move';
import { liftListItem, sinkListItem } from '../commands/blocks';
import { exitCode, indentCode, outdentCode } from '../commands/code';
import { chainCommands, selectAll } from '../commands/commands';
import { intentCommand } from '../commands/input';
import { redo, undo } from '../history/history';
import type { KeyInput } from '../state/input.types';
import { definePlugin } from '../state/plugin';
import type { Command, Plugin } from '../state/state.types';

export type Keymap = Readonly<Record<string, Command>>;

const MOD = new Set(['Mod', 'Ctrl', 'Control', 'Cmd', 'Meta']);

const LETTER = /^Key([A-Z])$/;

const canonical = (mod: boolean, alt: boolean, shift: boolean, key: string): string =>
  [
    mod ? 'Mod' : '',
    alt ? 'Alt' : '',
    shift ? 'Shift' : '',
    key.length === 1 ? key.toLowerCase() : key,
  ]
    .filter((part) => part !== '')
    .join('-');

const normalize = (name: string): string => {
  const parts = name.split(/-(?!$)/);
  const key = parts.at(-1) ?? '';
  const modifiers = new Set(parts.slice(0, -1));

  return canonical(
    [...modifiers].some((part) => MOD.has(part)),
    modifiers.has('Alt'),
    modifiers.has('Shift'),
    key,
  );
};

export const keyName = (key: KeyInput): string =>
  canonical(key.ctrl || key.meta, key.alt, key.shift, key.key);

const layoutFree = (key: KeyInput): string | undefined => {
  const letter = LETTER.exec(key.code)?.[1];

  return letter === undefined || !(key.ctrl || key.meta)
    ? undefined
    : canonical(true, key.alt, key.shift, letter);
};

export const keymap = (bindings: Keymap): Plugin => {
  const commands = new Map(
    Object.entries(bindings).map(([name, command]) => [normalize(name), command]),
  );

  return definePlugin({
    name: 'keymap',
    props: {
      handleKey: (key, state, dispatch) => {
        const fallback = layoutFree(key);

        const command =
          commands.get(keyName(key)) ??
          (fallback === undefined ? undefined : commands.get(fallback));

        return command?.(state, dispatch) ?? false;
      },
    },
  });
};

const format =
  (mark: string): Command =>
  (state, dispatch) =>
    intentCommand({ kind: 'format', mark })(state, dispatch);

export const baseKeymap: Keymap = {
  'Mod-b': format('bold'),
  'Mod-i': format('italic'),
  'Mod-u': format('underline'),
  'Mod-Shift-s': format('strike'),
  'Mod-e': format('code'),
  'Mod-a': selectAll,
  'Mod-z': undo,
  'Mod-Shift-z': redo,
  'Mod-y': redo,
  'Mod-Shift-ArrowUp': moveCurrent(-1),
  'Mod-Shift-ArrowDown': moveCurrent(1),
  'Mod-Enter': exitCode,
  Tab: chainCommands(indentCode, sinkListItem),
  'Shift-Tab': chainCommands(outdentCode, liftListItem),
};
