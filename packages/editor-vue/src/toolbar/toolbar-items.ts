import {
  activeBlock,
  activeMarks,
  ancestorTypes,
  insertDivider,
  markAttrs,
  redo,
  redoDepth,
  setBlockType,
  toggleList,
  toggleMark,
  toggleWrapper,
  undo,
  undoDepth,
  type Command,
  type EditorState,
} from '@numior/editor-core';
import type { IconAlias } from '@numior/primitives';
import type { NuiEditorMessages } from '../editor/editor.messages';
import type { SlashItem } from '../slash/slash-items';

export interface ToolbarFace {
  readonly label: string;
  readonly icon: IconAlias;
  readonly shortcut?: string | undefined;
  readonly pressed?: boolean | undefined;
  readonly disabled: boolean;
}

export interface ToolbarAction extends ToolbarFace {
  readonly kind: 'action';
  readonly key: string;
  readonly command: Command;
}

export interface ToolbarLink extends ToolbarFace {
  readonly kind: 'link';
  readonly key: 'link';
}

export interface ToolbarColours {
  readonly kind: 'colours';
  readonly key: 'colours';
  readonly label: string;
  readonly colour: string | null;
  readonly highlight: string | null;
  readonly colours: readonly string[];
  readonly highlights: readonly string[];
  readonly disabled: boolean;
}

export interface ToolbarOptions {
  readonly colours: readonly string[];
  readonly highlights: readonly string[];
}

export interface ToolbarBlock {
  readonly key: string;
  readonly label: string;
  readonly icon: IconAlias;
  readonly active: boolean;
  readonly command: Command;
}

export interface ToolbarBlocks {
  readonly kind: 'blocks';
  readonly key: 'blocks';
  readonly label: string;
  readonly icon: IconAlias;
  readonly options: readonly ToolbarBlock[];
}

export interface ToolbarInsert {
  readonly kind: 'insert';
  readonly key: 'insert';
  readonly label: string;
  readonly entries: readonly ToolbarInsertEntry[];
}

export interface ToolbarInsertEntry {
  readonly item: SlashItem;
  readonly disabled: boolean;
}

export type ToolbarItem =
  | ToolbarAction
  | ToolbarBlocks
  | ToolbarLink
  | ToolbarColours
  | ToolbarInsert;

export interface ToolbarGroup {
  readonly key: string;
  readonly items: readonly ToolbarItem[];
}

interface Facts {
  readonly state: EditorState;
  readonly texts: NuiEditorMessages;
  readonly options: ToolbarOptions;
  readonly marks: ReadonlySet<string>;
  readonly allowed: ReadonlySet<string>;
  readonly ancestors: readonly string[];
}

const MARKS: readonly (readonly [string, keyof NuiEditorMessages, IconAlias, string])[] = [
  ['bold', 'bold', 'bold', 'mod+b'],
  ['italic', 'italic', 'italic', 'mod+i'],
  ['underline', 'underline', 'underline', 'mod+u'],
  ['strike', 'strike', 'strikethrough', 'mod+shift+s'],
  ['code', 'code', 'code', 'mod+e'],
];

const LISTS: readonly (readonly [string, keyof NuiEditorMessages, IconAlias])[] = [
  ['bullet_list', 'bulletList', 'list'],
  ['ordered_list', 'orderedList', 'list-ordered'],
  ['todo_list', 'todoList', 'list-todo'],
];

const HEADINGS = [1, 2, 3] as const;

const textOf = (texts: NuiEditorMessages, key: keyof NuiEditorMessages): string => {
  const text = texts[key];

  return typeof text === 'string' ? text : '';
};

const historyItems = (facts: Facts): ToolbarItem[] => [
  {
    kind: 'action',
    key: 'undo',
    label: facts.texts.undo,
    icon: 'undo',
    shortcut: 'mod+z',
    disabled: undoDepth(facts.state) === 0,
    command: undo,
  },
  {
    kind: 'action',
    key: 'redo',
    label: facts.texts.redo,
    icon: 'redo',
    shortcut: 'mod+shift+z',
    disabled: redoDepth(facts.state) === 0,
    command: redo,
  },
];

const blockOptions = (facts: Facts): ToolbarBlock[] => {
  const { schema } = facts.state.doc;
  const current = activeBlock(facts.state);

  const headings = schema.nodes.has('heading')
    ? HEADINGS.map((level) => ({
        key: `heading-${String(level)}`,
        label: facts.texts.heading({ level }),
        icon: `heading-${String(level)}`,
        active: current?.type === 'heading' && current.attrs.level === level,
        command: setBlockType('heading', { level }),
      }))
    : [];

  return [
    ...(schema.nodes.has('paragraph')
      ? [
          {
            key: 'paragraph',
            label: facts.texts.text,
            icon: 'text',
            active: current?.type === 'paragraph',
            command: setBlockType('paragraph'),
          },
        ]
      : []),
    ...headings,
    ...(schema.nodes.has('code_block')
      ? [
          {
            key: 'code_block',
            label: facts.texts.codeBlock,
            icon: 'code-block',
            active: current?.type === 'code_block',
            command: setBlockType('code_block'),
          },
        ]
      : []),
  ];
};

const blockItems = (facts: Facts): ToolbarItem[] => {
  const options = blockOptions(facts);
  const current = options.find((option) => option.active) ?? options[0];

  return current === undefined
    ? []
    : [
        {
          kind: 'blocks',
          key: 'blocks',
          label: current.active ? current.label : facts.texts.text,
          icon: current.icon,
          options,
        },
      ];
};

const nameOf = (state: EditorState, mark: string): string | null => {
  const name = markAttrs(state, mark)?.name;

  return typeof name === 'string' ? name : null;
};

const linkItems = (facts: Facts): ToolbarItem[] =>
  facts.state.doc.schema.marks.has('link')
    ? [
        {
          kind: 'link',
          key: 'link',
          label: facts.texts.link,
          icon: 'link',
          shortcut: 'mod+k',
          pressed: markAttrs(facts.state, 'link') !== undefined,
          disabled: !facts.allowed.has('link'),
        },
      ]
    : [];

const colourItems = (facts: Facts): ToolbarItem[] => {
  const { marks } = facts.state.doc.schema;
  const colours = marks.has('color') ? facts.options.colours : [];
  const highlights = marks.has('highlight') ? facts.options.highlights : [];

  return colours.length + highlights.length === 0
    ? []
    : [
        {
          kind: 'colours',
          key: 'colours',
          label: facts.texts.colour,
          colour: nameOf(facts.state, 'color'),
          highlight: nameOf(facts.state, 'highlight'),
          colours,
          highlights,
          disabled: !facts.allowed.has('color') && !facts.allowed.has('highlight'),
        },
      ];
};

const markItems = (facts: Facts): ToolbarItem[] => [
  ...MARKS.filter(([mark]) => facts.state.doc.schema.marks.has(mark)).map(
    ([mark, text, icon, shortcut]): ToolbarItem => ({
      kind: 'action',
      key: mark,
      label: textOf(facts.texts, text),
      icon,
      shortcut,
      pressed: facts.marks.has(mark),
      disabled: !facts.allowed.has(mark),
      command: toggleMark(mark),
    }),
  ),
  ...linkItems(facts),
  ...colourItems(facts),
];

const blockActions = (facts: Facts): ToolbarItem[] => {
  const { state, texts, ancestors } = facts;
  const { schema } = state.doc;

  const lists = LISTS.filter(([type]) => schema.nodes.has(type)).map(
    ([type, text, icon]): ToolbarItem => {
      const command = toggleList(type);

      return {
        kind: 'action',
        key: type,
        label: textOf(texts, text),
        icon,
        pressed: ancestors.includes(type),
        disabled: !command(state),
        command,
      };
    },
  );

  const quote = toggleWrapper('blockquote');
  const divider = insertDivider();

  return [
    ...lists,
    ...(schema.nodes.has('blockquote')
      ? [
          {
            kind: 'action' as const,
            key: 'blockquote',
            label: texts.quote,
            icon: 'quote',
            pressed: ancestors.includes('blockquote'),
            disabled: !quote(state),
            command: quote,
          },
        ]
      : []),
    ...(schema.nodes.has('divider')
      ? [
          {
            kind: 'action' as const,
            key: 'divider',
            label: texts.divider,
            icon: 'separator',
            disabled: !divider(state),
            command: divider,
          },
        ]
      : []),
  ];
};

const insertItems = (
  state: EditorState,
  texts: NuiEditorMessages,
  inserts: readonly SlashItem[],
): ToolbarItem[] =>
  inserts.length === 0
    ? []
    : [
        {
          kind: 'insert',
          key: 'insert',
          label: texts.insert,
          entries: inserts.map((item) => ({
            item,
            disabled: item.kind === 'command' && !item.command(state),
          })),
        },
      ];

export const toolbarGroups = (
  state: EditorState,
  texts: NuiEditorMessages,
  options: ToolbarOptions,
  inserts: readonly SlashItem[] = [],
): ToolbarGroup[] => {
  const block = activeBlock(state);
  const blockType = block === undefined ? undefined : state.doc.schema.nodes.get(block.type);

  const facts: Facts = {
    state,
    texts,
    options,
    marks: activeMarks(state),
    allowed: blockType?.marks ?? new Set(state.doc.schema.marks.keys()),
    ancestors: ancestorTypes(state),
  };

  return [
    { key: 'history', items: historyItems(facts) },
    { key: 'insert', items: insertItems(state, texts, inserts) },
    { key: 'blocks', items: blockItems(facts) },
    { key: 'marks', items: markItems(facts) },
    { key: 'structure', items: blockActions(facts) },
  ].filter((group) => group.items.length > 0);
};
