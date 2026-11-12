import type { CommentThread } from '@numior/collaboration';
import {
  AnchorRangeKind,
  ContentNodeKind,
  type AnchorJSON,
  type ContentNode,
  type Doc,
  type ElementNode,
} from '@numior/editor-core';
import { team } from '#demo/team';

const [anna, , maria] = team;

const textOf = (node: ContentNode): string =>
  node.kind === ContentNodeKind.Text ? node.text : node.content.map(textOf).join('');

const isText = (node: ContentNode): boolean => node.kind === ContentNodeKind.Text;

const textBlocksOf = (node: ElementNode): readonly ElementNode[] =>
  node.content.flatMap((child) => {
    if (child.kind === ContentNodeKind.Text) {
      return [];
    }
    return child.content.some(isText) ? [child] : textBlocksOf(child);
  });

const anchorOf = (doc: Doc, phrase: string): AnchorJSON => {
  const block = textBlocksOf(doc.root).find((node) => textOf(node).includes(phrase));

  if (block === undefined) {
    throw new Error(`В описании нет текста «${phrase}»`);
  }

  const from = textOf(block).indexOf(phrase);

  return {
    kind: AnchorRangeKind.Text,
    fromId: block.id,
    fromOffset: from,
    toId: block.id,
    toOffset: from + phrase.length,
  };
};

export const threadsOf = (doc: Doc): readonly CommentThread[] => [
  {
    id: 'oak',
    anchor: anchorOf(doc, 'массива дуба'),
    author: maria,
    body: 'Покупатели спрашивают, не шпон ли это. Добавим фото среза?',
    createdAt: '2026-11-10T07:40:00.000Z',
    resolved: false,
    replies: [
      {
        id: 'oak-photo',
        author: anna,
        body: 'Попрошу фото у склада и добавлю к карточке.',
        createdAt: '2026-11-10T08:15:00.000Z',
      },
    ],
  },
  {
    id: 'load',
    anchor: anchorOf(doc, 'до 120 кг'),
    author: anna,
    body: 'В паспорте поставщика 110 кг, сверьте с образцом.',
    createdAt: '2026-11-11T11:05:00.000Z',
    resolved: false,
    replies: [],
  },
];
