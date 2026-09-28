import { describe, expect, it } from 'vitest';
import { byPath } from '../src';
import { readSelected, recordPath } from '../src/paths/selector';
import { recordReads } from '../src/values/reads';

interface Team {
  name: string;
  nickname?: string;
  owner: { email: string };
  members: { email: string }[];
}

const team: Team = {
  name: 'Core',
  owner: { email: 'lead@example.com' },
  members: [{ email: 'ann@example.com' }, { email: 'bob@example.com' }],
};

const fallback = (values: Team) => values.nickname ?? values.name;

const BRANCHED =
  'A field selector may only read one chain of properties, like (v) => v.contacts[0]?.name';

describe('field selectors', () => {
  it('record the property chain they read, through indexes and optional steps', () => {
    expect(recordPath(team, (values) => values.owner.email)).toBe('owner.email');
    expect(recordPath(team, (values) => values.members[1]?.email)).toBe('members.1.email');
    expect(recordPath(team, (values) => values.members[7]?.email)).toBe('members.7.email');
  });

  it('refuse branching reads, calls and the whole values', () => {
    expect(() => recordPath(team, (values) => (values.name ? values.owner.email : ''))).toThrow(
      BRANCHED,
    );

    expect(() => recordPath(team, (values) => values.members.at(0)?.email)).toThrow(BRANCHED);

    expect(() => recordPath(team, (values) => values)).toThrow(
      'A field selector must read a property of the values',
    );
  });

  it('read a value only when it is the one stored at their path', () => {
    const path = recordPath(team, fallback);

    expect(path).toBe('nickname');
    expect(readSelected({ ...team, nickname: 'C' }, fallback, path)).toBe('C');

    expect(() => readSelected(team, fallback, path)).toThrow(
      'The field selector reads something other than nickname',
    );

    expect(readSelected(team, (values) => values.members[5]?.email, 'members.5.email')).toBe(
      undefined,
    );
  });

  it('read list and object values through a recording view', () => {
    const log = recordReads(team);
    const members = readSelected(log.view, (values) => values.members, 'members');

    expect(members).toHaveLength(2);
    expect(readSelected(log.view, (values) => values.members, 'members')).toBe(members);
    expect(readSelected(log.view, (values) => values.owner, 'owner')).toEqual(team.owner);

    expect(() => readSelected(log.view, (values) => values.members, 'owner')).toThrow(
      'The field selector reads something other than owner',
    );
  });

  it('read untyped string paths as unknown values', () => {
    const select = byPath('members[1].email');

    expect(recordPath(team, select)).toBe('members.1.email');
    expect(select(team)).toBe('bob@example.com');
  });
});
