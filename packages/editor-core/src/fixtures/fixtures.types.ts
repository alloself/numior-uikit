export type FixtureColumnType = (typeof FixtureColumnType)[keyof typeof FixtureColumnType];
export type FixtureBlock = (typeof FixtureBlock)[keyof typeof FixtureBlock];

export const FixtureBlock = {
  Paragraph: 'paragraph',
  Heading: 'heading',
  List: 'list',
  Table: 'table',
  Code: 'code',
  Image: 'image',
  Callout: 'callout',
  Toggle: 'toggle',
  Columns: 'columns',
  Quote: 'quote',
  Divider: 'divider',
} as const;

export const FixtureList = {
  Bullet: 'bullet_list',
  Ordered: 'ordered_list',
  Todo: 'todo_list',
} as const;

export const FixtureColumnType = {
  Text: 'text',
  Number: 'number',
  Date: 'date',
  Boolean: 'boolean',
  Select: 'select',
} as const;
