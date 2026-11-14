import type { DocumentVersion } from '@numior/collaboration';
import { contentSchema } from '@numior/content';
import { fromHTML, toJSON } from '@numior/editor-core';
import { brief } from '#demo/description';
import { team } from '#demo/team';
import type { StoredVersion } from './adapter';

type Edit = readonly [string, string];

const [anna, , maria] = team;

const NO_COVER: Edit = [' Чехол снимается и стирается при 30&nbsp;°C.', ''];
const OLD_SEAT: Edit = ['Высота сиденья 42 см', 'Высота сиденья 45 см'];
const OLD_LOAD: Edit = ['до 120 кг', 'до 100 кг'];

const edited = (edits: readonly Edit[]): string =>
  edits.reduce((html, [from, to]) => html.replace(from, to), brief);

const stored = (version: DocumentVersion, html: string): StoredVersion => ({
  version,
  document: toJSON(fromHTML(contentSchema, html)),
});

export const versions: readonly StoredVersion[] = [
  stored(
    { id: 'draft', label: 'Черновик', author: maria, createdAt: '2026-11-09T10:20:00.000Z' },
    edited([NO_COVER, OLD_SEAT, OLD_LOAD]),
  ),
  stored(
    { id: 'sizes', label: 'Размеры', author: anna, createdAt: '2026-11-10T12:45:00.000Z' },
    edited([NO_COVER]),
  ),
  stored(
    { id: 'care', label: 'Уход за чехлом', author: maria, createdAt: '2026-11-11T09:05:00.000Z' },
    brief,
  ),
];
