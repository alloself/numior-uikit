import {
  Bold,
  Braces,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Redo2,
  SeparatorHorizontal,
  Strikethrough,
  TextQuote,
  Underline,
  Undo2,
} from '@lucide/vue';
import {
  activeBlock,
  activeMarks,
  ancestorTypes,
  insertDivider,
  liftListItem,
  markAttrs,
  redo,
  redoDepth,
  setBlockType,
  sinkListItem,
  toggleList,
  toggleMark,
  toggleWrapper,
  undo,
  undoDepth,
  type Command,
  type EditorState,
} from '@numior/editor-core';
import type { IconSource } from '@numior/primitives';
import type { NuiEditorMessages } from '../editor/editor.messages';
import type { SlashItem } from '../slash/slash-items';
import { onlyIf } from '../editor/only-if';
import { ToolbarGroupKey, ToolbarItemKind } from './toolbar.types';
import { NuiContentNodeType } from '@numior/content';

export interface ToolbarFace {
  readonly label: string;
  readonly icon: IconSource;
  readonly shortcut?: string | undefined;
  readonly pressed?: boolean | undefined;
  readonly disabled: boolean;
}

export interface ToolbarAction extends ToolbarFace {
  readonly kind: typeof ToolbarItemKind.Action;
  readonly key: string;
  readonly command: Command;
}

export interface ToolbarLink extends ToolbarFace {
  readonly kind: typeof ToolbarItemKind.Link;
  readonly key: 'link';
}

export interface ToolbarColours {
  readonly kind: typeof ToolbarItemKind.Colours;
  readonly key: 'colours';
  readonly label: string;
  readonly colour: string | null;
  readonly highlight: string | null;
  readonly colours: readonly string[];
  readonly highlights: readonly string[];
  readonly disabled: boolean;
}

export interface NuiEditorSelectionAction {
  readonly key: string;
  readonly label: string;
  readonly icon: IconSource;
  readonly command: Command;
}

export interface ToolbarOptions {
  readonly colours: readonly string[];
  readonly highlights: readonly string[];
  readonly docked?: boolean | undefined;
  readonly selectionActions?: readonly NuiEditorSelectionAction[] | undefined;
  readonly actionsOnly?: boolean | undefined;
}

export interface ToolbarBlock {
  readonly key: string;
  readonly label: string;
  readonly icon: IconSource;
  readonly active: boolean;
  readonly command: Command;
}

export interface ToolbarBlocks {
  readonly kind: typeof ToolbarItemKind.Blocks;
  readonly key: 'blocks';
  readonly label: string;
  readonly icon: IconSource;
  readonly options: readonly ToolbarBlock[];
}

export interface ToolbarInsert {
  readonly kind: typeof ToolbarItemKind.Insert;
  readonly key: 'insert';
  readonly label: string;
  readonly state: EditorState;
  readonly items: readonly SlashItem[];
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

const MARKS: readonly (readonly [string, keyof NuiEditorMessages, IconSource, string])[] = [
  ['bold', 'bold', Bold, 'mod+b'],
  ['italic', 'italic', Italic, 'mod+i'],
  ['underline', 'underline', Underline, 'mod+u'],
  ['strike', 'strike', Strikethrough, 'mod+shift+s'],
  ['code', 'code', 'code', 'mod+e'],
];

const LISTS: readonly (readonly [string, keyof NuiEditorMessages, IconSource])[] = [
  ['bullet_list', 'bulletList', List],
  ['ordered_list', 'orderedList', ListOrdered],
  ['todo_list', 'todoList', ListTodo],
];

const HEADINGS = [1, 2, 3] as const;

const HEADING_ICONS: Readonly<Record<(typeof HEADINGS)[number], IconSource>> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
};

const textOf = (texts: NuiEditorMessages, key: keyof NuiEditorMessages): string => {
  const text = texts[key];

  return typeof text === 'string' ? text : '';
};

const historyItems = (facts: Facts): ToolbarItem[] => [
  {
    kind: 'action',
    key: 'undo',
    label: facts.texts.undo,
    icon: Undo2,
    shortcut: 'mod+z',
    disabled: undoDepth(facts.state) === 0,
    command: undo,
  },
  {
    kind: 'action',
    key: 'redo',
    label: facts.texts.redo,
    icon: Redo2,
    shortcut: 'mod+shift+z',
    disabled: redoDepth(facts.state) === 0,
    command: redo,
  },
];

const blockOptions = (facts: Facts): ToolbarBlock[] => {
  const { schema } = facts.state.doc;
  const current = activeBlock(facts.state);

  const headings = schema.nodes.has('heading')
    ? HEADINGS.map((level): ToolbarBlock => ({
        key: `heading-${String(level)}`,
        label: facts.texts.heading({ level }),
        icon: HEADING_ICONS[level],
        active: current?.type === NuiContentNodeType.Heading && current.attrs.level === level,
        command: setBlockType('heading', { level }),
      }))
    : [];

  return [
    ...onlyIf<ToolbarBlock>(schema.nodes.has('paragraph'), () => ({
      key: 'paragraph',
      label: facts.texts.text,
      icon: Pilcrow,
      active: current?.type === NuiContentNodeType.Paragraph,
      command: setBlockType('paragraph'),
    })),
    ...headings,
    ...onlyIf<ToolbarBlock>(schema.nodes.has('code_block'), () => ({
      key: 'code_block',
      label: facts.texts.codeBlock,
      icon: Braces,
      active: current?.type === NuiContentNodeType.CodeBlock,
      command: setBlockType('code_block'),
    })),
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
  ...MARKS.reduce<ToolbarItem[]>((found, [mark, text, icon, shortcut]) => {
    if (facts.state.doc.schema.marks.has(mark)) {
      found.push({
        kind: 'action',
        key: mark,
        label: textOf(facts.texts, text),
        icon,
        shortcut,
        pressed: facts.marks.has(mark),
        disabled: !facts.allowed.has(mark),
        command: toggleMark(mark),
      });
    }
    return found;
  }, []),
  ...linkItems(facts),
  ...colourItems(facts),
];

const blockActions = (facts: Facts): ToolbarItem[] => {
  const { state, texts, ancestors } = facts;
  const { schema } = state.doc;

  const lists = LISTS.reduce<ToolbarItem[]>((found, [type, text, icon]) => {
    if (!schema.nodes.has(type)) {
      return found;
    }
    const command = toggleList(type);

    found.push({
      kind: 'action',
      key: type,
      label: textOf(texts, text),
      icon,
      pressed: ancestors.includes(type),
      disabled: !command(state),
      command,
    });

    return found;
  }, []);

  const quote = toggleWrapper('blockquote');
  const divider = insertDivider();

  return [
    ...lists,
    ...onlyIf<ToolbarItem>(schema.nodes.has('blockquote'), () => ({
      kind: 'action',
      key: 'blockquote',
      label: texts.quote,
      icon: TextQuote,
      pressed: ancestors.includes('blockquote'),
      disabled: !quote(state),
      command: quote,
    })),
    ...onlyIf<ToolbarItem>(schema.nodes.has('divider'), () => ({
      kind: 'action',
      key: 'divider',
      label: texts.divider,
      icon: SeparatorHorizontal,
      disabled: !divider(state),
      command: divider,
    })),
  ];
};

const nestingItems = ({ state, texts, options }: Facts): ToolbarItem[] =>
  options.docked === true
    ? [
        {
          kind: 'action',
          key: 'outdent',
          label: texts.outdent,
          icon: ListIndentDecrease,
          disabled: !liftListItem(state),
          command: liftListItem,
        },
        {
          kind: 'action',
          key: 'indent',
          label: texts.indent,
          icon: ListIndentIncrease,
          disabled: !sinkListItem(state),
          command: sinkListItem,
        },
      ]
    : [];

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
          state,
          items: inserts,
        },
      ];

const selectionItems = ({ state, options }: Facts): ToolbarItem[] =>
  (options.selectionActions ?? []).map((action) => ({
    kind: ToolbarItemKind.Action,
    key: action.key,
    label: action.label,
    icon: action.icon,
    command: action.command,
    disabled: !action.command(state),
  }));

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

  if (options.actionsOnly === true) {
    return [{ key: ToolbarGroupKey.Selection, items: selectionItems(facts) }];
  }

  return [
    { key: 'history', items: historyItems(facts) },
    { key: 'insert', items: insertItems(state, texts, inserts) },
    { key: 'blocks', items: blockItems(facts) },
    { key: 'marks', items: markItems(facts) },
    { key: 'selection', items: selectionItems(facts) },
    { key: 'structure', items: blockActions(facts) },
    { key: 'nesting', items: nestingItems(facts) },
  ].filter((group) => group.items.length > 0);
};
