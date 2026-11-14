import type { DocumentVersion } from '@numior/collaboration';
import { contentSchema } from '@numior/content';
import { fromHTML, toJSON } from '@numior/editor-core';
import { brief } from '#demo/description';
import { team } from '#demo/team';
import type { StoredVersion } from './adapter';

type Edit = readonly [string, string];

const [anna, , maria] = team;

const NO_COVER: Edit = [' The cover comes off and washes at 30&nbsp;°C.', ''];
const OLD_SEAT: Edit = ['Seat height 16.5 in', 'Seat height 17.5 in'];
const OLD_LOAD: Edit = ['up to 265 lb', 'up to 220 lb'];

const edited = (edits: readonly Edit[]): string =>
  edits.reduce((html, [from, to]) => html.replace(from, to), brief);

const stored = (version: DocumentVersion, html: string): StoredVersion => ({
  version,
  document: toJSON(fromHTML(contentSchema, html)),
});

export const versions: readonly StoredVersion[] = [
  stored(
    { id: 'draft', label: 'Draft', author: maria, createdAt: '2026-11-09T10:20:00.000Z' },
    edited([NO_COVER, OLD_SEAT, OLD_LOAD]),
  ),
  stored(
    { id: 'sizes', label: 'Dimensions', author: anna, createdAt: '2026-11-10T12:45:00.000Z' },
    edited([NO_COVER]),
  ),
  stored(
    { id: 'care', label: 'Cover care', author: maria, createdAt: '2026-11-11T09:05:00.000Z' },
    brief,
  ),
];
