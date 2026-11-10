import { isRecord } from '@numior/primitives/guards';
import type { CellAddress, CellRange } from '../cell.types';
import type {
  WorkbookPeer,
  WorkbookPlace,
  WorkbookPresence,
  WorkbookSelection,
  WorkbookUser,
} from './presence.types';

const COLOURS = 8;

const isIndex = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isUser = (value: unknown): value is WorkbookUser =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  (value.avatar === undefined || typeof value.avatar === 'string');

const isAddress = (value: unknown): value is CellAddress =>
  isRecord(value) && isIndex(value.row) && isIndex(value.col);

const isRange = (value: unknown): value is CellRange =>
  isRecord(value) &&
  isIndex(value.top) &&
  isIndex(value.left) &&
  isIndex(value.bottom) &&
  isIndex(value.right);

const isSelection = (value: unknown): value is WorkbookSelection =>
  isRecord(value) &&
  isAddress(value.active) &&
  Array.isArray(value.ranges) &&
  value.ranges.every(isRange);

const isPlace = (value: unknown): value is WorkbookPlace =>
  isRecord(value) && typeof value.sheet === 'string' && isSelection(value.selection);

const isPresence = (value: unknown): value is WorkbookPresence =>
  isRecord(value) && isUser(value.user) && (value.place === undefined || isPlace(value.place));

const hashOf = (id: string): number =>
  Array.from(id).reduce((sum, char) => (Math.imul(sum, 31) + (char.codePointAt(0) ?? 0)) | 0, 7);

const colourOf = (id: string): number => (hashOf(id) >>> 0) % COLOURS;

export const workbookPeers = (states: ReadonlyMap<string, unknown>): readonly WorkbookPeer[] =>
  [...states].reduce<WorkbookPeer[]>((peers, [clientId, state]) => {
    if (isPresence(state)) {
      peers.push({
        clientId,
        user: state.user,
        place: state.place,
        colour: colourOf(state.user.id),
      });
    }

    return peers;
  }, []);
