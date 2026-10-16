import { describe, expect, it } from 'vite-plus/test';
import {
  anyOf,
  isBoolean,
  isDate,
  isNumber,
  isRecord,
  isString,
  listOf,
  nullable,
  oneOf,
  optional,
  parseAs,
  recordOf,
  shapeOf,
} from '../src';

const isPerson = shapeOf({
  name: isString,
  age: optional(isNumber),
  tags: listOf(isString),
  role: oneOf('admin', 'guest'),
  born: nullable(isDate),
});

describe('runtime guards', () => {
  it('accepts values of the declared shape and rejects everything else', () => {
    const person = { name: 'Ann', tags: ['a'], role: 'admin', born: null };

    expect(isPerson(person)).toBe(true);
    expect(isPerson({ ...person, age: 3, born: new Date(0) })).toBe(true);
    expect(isPerson({ ...person, role: 'owner' })).toBe(false);
    expect(isPerson({ ...person, tags: [1] })).toBe(false);
    expect(isPerson({ ...person, age: '3' })).toBe(false);
    expect(isPerson(null)).toBe(false);
    expect(isPerson([])).toBe(false);
  });

  it('combines guards for unions, records and primitives', () => {
    const isId = anyOf(isString, isNumber);
    const isFlags = recordOf(isBoolean);

    expect([isId('a'), isId(1), isId(true)]).toEqual([true, true, false]);
    expect([isFlags({ a: true }), isFlags({ a: 1 }), isFlags([])]).toEqual([true, false, false]);
    expect([isRecord({}), isRecord([]), isRecord(null)]).toEqual([true, false, false]);
  });

  it('parses JSON through a guard and names what was expected on failure', () => {
    expect(
      parseAs('{"name":"Ann","tags":[],"role":"guest","born":null}', isPerson, 'person'),
    ).toEqual({ name: 'Ann', tags: [], role: 'guest', born: null });

    expect(() => parseAs('{"name":1}', isPerson, 'person')).toThrow('Unexpected person');
  });
});
