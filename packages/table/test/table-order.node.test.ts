import { describe, expect, it } from 'vite-plus/test';
import { movedKeys, orderLeaves } from '../src/table/table-order';
import { PEOPLE_COLUMNS } from './support/people';

const keysOf = (order: readonly string[]): string[] =>
  orderLeaves(PEOPLE_COLUMNS, order).map((column) => column.key);

describe('column order', () => {
  it('puts the ordered keys first and keeps the rest in definition order', () => {
    expect(keysOf([]).slice(0, 4)).toEqual(['id', 'name', 'city', 'salary']);
    expect(keysOf(['city', 'name']).slice(0, 4)).toEqual(['city', 'name', 'id', 'salary']);
    expect(keysOf(['ghost', 'team', 'team']).slice(0, 3)).toEqual(['team', 'id', 'name']);
  });

  it('moves a key before or after another one and ignores unknown keys', () => {
    const keys = ['id', 'name', 'city', 'salary'];

    expect(movedKeys(keys, 'name', 'salary', true)).toEqual(['id', 'city', 'salary', 'name']);
    expect(movedKeys(keys, 'salary', 'id', false)).toEqual(['salary', 'id', 'name', 'city']);
    expect(movedKeys(keys, 'name', 'name', true)).toEqual(keys);
    expect(movedKeys(keys, 'name', 'ghost', true)).toEqual(keys);
  });
});
