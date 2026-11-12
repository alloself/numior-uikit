import { describe, expect, it } from 'vite-plus/test';
import { CollabStatusKind } from '../src';
import { createNetwork, paragraphs, type CollabNetwork } from './harness/network';
import {
  SHEET,
  createBookNetwork,
  valueCell,
  writeCells,
  type BookNetwork,
} from './harness/workbook-network';

interface Crowd {
  readonly network: CollabNetwork;
  readonly marks: readonly string[];
}

const LINES = 60;

const LINE = '.'.repeat(40);

const FIRST_MARK = 0x4e_00;

const crowdOf = (people: number): Crowd => {
  const names = Array.from({ length: people }, (_, index) => `u${index.toString()}`);

  const network = createNetwork(paragraphs(...Array.from({ length: LINES }, () => LINE)), names);

  network.settle();

  return {
    network,
    marks: names.map((_, index) => String.fromCodePoint(FIRST_MARK + index)),
  };
};

const typeTogether = ({ network, marks }: Crowd, writers: number, rounds: number): void => {
  for (let round = 0; round < rounds; round += 1) {
    network.clients.slice(0, writers).forEach((client, index) => {
      const seed = index * 7919 + round * 104_729;
      const line = client.state().doc.positionOf(`p${(seed % LINES).toString()}`) ?? 0;

      client.edit((tr) => {
        tr.insertText(marks[index] ?? '', line + 1 + (seed % LINE.length));
      });
    });

    network.settle();
  }
};

const textOf = ({ network }: Crowd): string => JSON.stringify(network.docs()[0]);

const typedBy = (crowd: Crowd, writers: number): readonly number[] => {
  const text = textOf(crowd);

  return crowd.marks.slice(0, writers).map((mark) => text.split(mark).length - 1);
};

const distinctDocs = ({ network }: Crowd): number =>
  new Set(network.docs().map((doc) => JSON.stringify(doc))).size;

const statuses = ({ network }: Crowd): ReadonlySet<string> =>
  new Set(network.clients.map((client) => client.status().kind));

const FIRST_ROW = 10;

const COLUMNS = 5;

const INSERTS_EVERY = 5;

const bookOf = (people: number): BookNetwork =>
  createBookNetwork(Array.from({ length: people }, (_, index) => `u${index.toString()}`));

const noteOf = (writer: number, round: number): string =>
  `w${writer.toString()}r${round.toString()};`;

const writeTogether = (network: BookNetwork, writers: number, rounds: number): void => {
  for (let round = 0; round < rounds; round += 1) {
    network.clients.slice(0, writers).forEach((client, index) => {
      client.commit(
        index % INSERTS_EVERY === 0
          ? [{ kind: 'insertLines', sheet: SHEET, axis: 'rows', at: 0, count: 1 }]
          : [writeCells(valueCell(FIRST_ROW + index, round % COLUMNS, noteOf(index, round)))],
      );
    });

    network.settle();
  }
};

const missingNotes = (network: BookNetwork, writers: number, rounds: number): readonly string[] => {
  const dump = network.clients[0]?.dump() ?? '';

  return Array.from({ length: writers }, (_, index) => noteOf(index, rounds - 1)).filter(
    (note, index) => index % INSERTS_EVERY !== 0 && !dump.includes(note),
  );
};

describe('a crowded room', () => {
  it.each([
    { people: 20, writers: 20, rounds: 10 },
    { people: 100, writers: 10, rounds: 10 },
    { people: 100, writers: 100, rounds: 4 },
  ])(
    'keeps every keystroke of $writers writers among $people people and takes each batch on the first try',
    ({ people, writers, rounds }) => {
      const crowd = crowdOf(people);
      const before = crowd.network.traffic();

      typeTogether(crowd, writers, rounds);

      const after = crowd.network.traffic();

      expect(distinctDocs(crowd)).toBe(1);
      expect(typedBy(crowd, writers)).toEqual(Array.from({ length: writers }, () => rounds));
      expect(statuses(crowd)).toEqual(new Set([CollabStatusKind.Online]));
      expect(after.rejections - before.rejections).toBe(0);
      expect(after.submits - before.submits).toBe(writers * rounds);
    },
    120_000,
  );

  it.each([
    { people: 20, writers: 20, rounds: 6 },
    { people: 100, writers: 10, rounds: 6 },
    { people: 100, writers: 100, rounds: 3 },
  ])(
    'keeps every cell of $writers writers among $people people of a book while rows are inserted above them',
    ({ people, writers, rounds }) => {
      const network = bookOf(people);
      const before = network.traffic();

      writeTogether(network, writers, rounds);

      const after = network.traffic();

      expect(new Set(network.clients.map((client) => client.dump())).size).toBe(1);
      expect(missingNotes(network, writers, rounds)).toEqual([]);
      expect(after.rejections - before.rejections).toBe(0);
      expect(after.submits - before.submits).toBe(writers * rounds);
    },
    120_000,
  );
});
