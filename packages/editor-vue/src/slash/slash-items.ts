import {
  Braces,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  SeparatorHorizontal,
  TextQuote,
} from '@lucide/vue';
import {
  insertBelow,
  insertDivider,
  setBlockType,
  toggleList,
  wrapInBlock,
  type Command,
  type Schema,
} from '@numior/editor-core';
import { CONTENT_HEADING_LEVELS } from '@numior/content';
import { foldText, type IconSource } from '@numior/primitives';
import type { NuiEditorMessages } from '../editor/editor.messages';
import { HEADING_ICONS } from '../editor/heading-icons';
import { SlashItemKind } from '../suggest/suggest.types';

interface SlashLabel {
  readonly key: string;
  readonly label: string;
  readonly icon: IconSource;
  readonly keywords: readonly string[];
}

export type SlashCommandItem = SlashLabel & {
  readonly kind: typeof SlashItemKind.Command;
  readonly command: Command;
};

export type SlashItem =
  | SlashCommandItem
  | (SlashLabel & { readonly kind: typeof SlashItemKind.Open; readonly open: () => void });

interface SlashText {
  readonly label: string;
  readonly keywords?: readonly string[] | undefined;
}

interface SlashEntry {
  readonly key: string;
  readonly node: string;
  readonly label: (texts: NuiEditorMessages) => string;
  readonly icon: IconSource;
  readonly keywords: readonly string[];
  readonly command: () => Command;
}

const ENTRIES: readonly SlashEntry[] = [
  {
    key: 'paragraph',
    node: 'paragraph',
    label: (texts) => texts.text,
    icon: Pilcrow,
    keywords: ['text', 'paragraph', 'p'],
    command: () => setBlockType('paragraph'),
  },
  ...CONTENT_HEADING_LEVELS.map((level): SlashEntry => ({
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
    icon: List,
    keywords: ['bullet', 'list', 'ul'],
    command: () => toggleList('bullet_list'),
  },
  {
    key: 'ordered_list',
    node: 'ordered_list',
    label: (texts) => texts.orderedList,
    icon: ListOrdered,
    keywords: ['numbered', 'ordered', 'list', 'ol'],
    command: () => toggleList('ordered_list'),
  },
  {
    key: 'todo_list',
    node: 'todo_list',
    label: (texts) => texts.todoList,
    icon: ListTodo,
    keywords: ['todo', 'task', 'check'],
    command: () => toggleList('todo_list'),
  },
  {
    key: 'blockquote',
    node: 'blockquote',
    label: (texts) => texts.quote,
    icon: TextQuote,
    keywords: ['quote', 'blockquote'],
    command: () => wrapInBlock('blockquote'),
  },
  {
    key: 'code_block',
    node: 'code_block',
    label: (texts) => texts.codeBlock,
    icon: Braces,
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
    icon: SeparatorHorizontal,
    keywords: ['divider', 'hr', 'line', 'separator'],
    command: () => insertDivider(),
  },
];

export const slashItems = (schema: Schema, texts: NuiEditorMessages): SlashCommandItem[] =>
  ENTRIES.reduce<SlashCommandItem[]>((found, entry) => {
    if (schema.nodes.has(entry.node)) {
      found.push({
        key: entry.key,
        label: entry.label(texts),
        icon: entry.icon,
        keywords: entry.keywords,
        kind: 'command',
        command: entry.command(),
      });
    }
    return found;
  }, []);

export const matchesSlash = (item: SlashText, query: string): boolean => {
  const needle = foldText(query.trim());

  return (
    needle === '' ||
    foldText(item.label).includes(needle) ||
    (item.keywords ?? []).some((keyword) => foldText(keyword).startsWith(needle))
  );
};

export const filterSlash = (items: readonly SlashItem[], query: string): SlashItem[] =>
  items.filter((item) => matchesSlash(item, query));

export const belowItems = (items: readonly SlashItem[]): SlashItem[] =>
  items.map((item) =>
    item.kind === SlashItemKind.Command ? { ...item, command: insertBelow(item.command) } : item,
  );
