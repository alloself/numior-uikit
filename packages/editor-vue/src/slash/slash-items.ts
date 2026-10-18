import {
  insertDivider,
  setBlockType,
  toggleList,
  wrapInBlock,
  type Command,
  type Schema,
} from '@numior/editor-core';
import type { IconAlias } from '@numior/primitives';
import type { NuiEditorMessages } from '../editor/editor.messages';

const HEADING_ICONS: Readonly<Record<1 | 2 | 3, IconAlias>> = {
  1: 'heading-1',
  2: 'heading-2',
  3: 'heading-3',
};

interface SlashLabel {
  readonly key: string;
  readonly label: string;
  readonly icon: IconAlias;
  readonly keywords: readonly string[];
}

export type SlashCommandItem = SlashLabel & { readonly kind: 'command'; readonly command: Command };

export type SlashItem =
  | SlashCommandItem
  | (SlashLabel & { readonly kind: 'open'; readonly open: () => void });

interface SlashEntry {
  readonly key: string;
  readonly node: string;
  readonly label: (texts: NuiEditorMessages) => string;
  readonly icon: IconAlias;
  readonly keywords: readonly string[];
  readonly command: () => Command;
}

const ENTRIES: readonly SlashEntry[] = [
  {
    key: 'paragraph',
    node: 'paragraph',
    label: (texts) => texts.text,
    icon: 'text',
    keywords: ['text', 'paragraph', 'p'],
    command: () => setBlockType('paragraph'),
  },
  ...([1, 2, 3] as const).map((level): SlashEntry => ({
    key: `heading-${String(level)}`,
    node: 'heading',
    label: (texts) => texts.heading({ level }),
    icon: HEADING_ICONS[level],
    keywords: ['heading', 'title', `h${String(level)}`],
    command: () => setBlockType('heading', { level }),
  })),
  {
    key: 'bullet_list',
    node: 'bullet_list',
    label: (texts) => texts.bulletList,
    icon: 'list',
    keywords: ['bullet', 'list', 'ul'],
    command: () => toggleList('bullet_list'),
  },
  {
    key: 'ordered_list',
    node: 'ordered_list',
    label: (texts) => texts.orderedList,
    icon: 'list-ordered',
    keywords: ['numbered', 'ordered', 'list', 'ol'],
    command: () => toggleList('ordered_list'),
  },
  {
    key: 'todo_list',
    node: 'todo_list',
    label: (texts) => texts.todoList,
    icon: 'list-todo',
    keywords: ['todo', 'task', 'check'],
    command: () => toggleList('todo_list'),
  },
  {
    key: 'blockquote',
    node: 'blockquote',
    label: (texts) => texts.quote,
    icon: 'quote',
    keywords: ['quote', 'blockquote'],
    command: () => wrapInBlock('blockquote'),
  },
  {
    key: 'code_block',
    node: 'code_block',
    label: (texts) => texts.codeBlock,
    icon: 'code-block',
    keywords: ['code', 'pre', 'snippet'],
    command: () => setBlockType('code_block'),
  },
  {
    key: 'callout',
    node: 'callout',
    label: (texts) => texts.callout,
    icon: 'info',
    keywords: ['callout', 'note', 'info'],
    command: () => wrapInBlock('callout'),
  },
  {
    key: 'toggle',
    node: 'toggle',
    label: (texts) => texts.toggle,
    icon: 'chevron-right',
    keywords: ['toggle', 'details', 'collapse'],
    command: () => wrapInBlock('toggle'),
  },
  {
    key: 'divider',
    node: 'divider',
    label: (texts) => texts.divider,
    icon: 'separator',
    keywords: ['divider', 'hr', 'line', 'separator'],
    command: () => insertDivider(),
  },
];

export const slashItems = (schema: Schema, texts: NuiEditorMessages): SlashCommandItem[] =>
  ENTRIES.filter((entry) => schema.nodes.has(entry.node)).map((entry) => ({
    key: entry.key,
    label: entry.label(texts),
    icon: entry.icon,
    keywords: entry.keywords,
    kind: 'command',
    command: entry.command(),
  }));

export const filterSlash = (items: readonly SlashItem[], query: string): SlashItem[] => {
  const needle = query.trim().toLocaleLowerCase();

  return needle === ''
    ? [...items]
    : items.filter(
        (item) =>
          item.label.toLocaleLowerCase().includes(needle) ||
          item.keywords.some((keyword) => keyword.startsWith(needle)),
      );
};
