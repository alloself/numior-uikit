import type { ContentNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { contentToHTML } from './serialize';

const OWN = 'data-numior-editor';

export const clipboardHTML = (schema: Schema, content: readonly ContentNode[]): string =>
  `<div ${OWN}="1">${contentToHTML(schema, content)}</div>`;

export const isOwnHTML = (html: string): boolean => html.includes(OWN);
