import {
  activeBlock,
  activeMarks,
  ancestorTypes,
  insertDivider,
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

export interface ToolbarAction {
  readonly kind: 'action';
  readonly key: string;
  readonly label: string;
  readonly icon: IconAlias;
  readonly shortcut?: string | undefined;
  readonly pressed?: boolean | undefined;
  readonly disabled: boolean;
  readonly command: Command;
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
  readonly options: readonly ToolbarBlock[];
}

export type ToolbarItem = ToolbarAction | ToolbarBlocks;

export interface ToolbarGroup {
  readonly key: string;
  readonly items: readonly ToolbarItem[];
}

interface Facts {
  readonly state: EditorState;
  readonly texts: NuiEditorMessages;
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

  return options.length === 0
    ? []
    : [
        {
          kind: 'blocks',
          key: 'blocks',
          label: options.find((option) => option.active)?.label ?? facts.texts.text,
          options,
        },
      ];
};

const markItems = (facts: Facts): ToolbarItem[] =>
  MARKS.filter(([mark]) => facts.state.doc.schema.marks.has(mark)).map(
    ([mark, text, icon, shortcut]) => ({
      kind: 'action',
      key: mark,
      label: textOf(facts.texts, text),
      icon,
      shortcut,
      pressed: facts.marks.has(mark),
      disabled: !facts.allowed.has(mark),
      command: toggleMark(mark),
    }),
  );

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

export const toolbarGroups = (state: EditorState, texts: NuiEditorMessages): ToolbarGroup[] => {
  const block = activeBlock(state);
  const blockType = block === undefined ? undefined : state.doc.schema.nodes.get(block.type);

  const facts: Facts = {
    state,
    texts,
    marks: activeMarks(state),
    allowed: blockType?.marks ?? new Set(state.doc.schema.marks.keys()),
    ancestors: ancestorTypes(state),
  };

  return [
    { key: 'history', items: historyItems(facts) },
    { key: 'blocks', items: blockItems(facts) },
    { key: 'marks', items: markItems(facts) },
    { key: 'structure', items: blockActions(facts) },
  ].filter((group) => group.items.length > 0);
};
