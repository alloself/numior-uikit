import { describe, expect, it } from 'vite-plus/test';
import { createEchoes } from '../src/table/table-echoes';

describe('createEchoes', () => {
  it('drops the echoes of sent values in order and lets other values through', () => {
    const echoes = createEchoes<number>(Object.is);

    echoes.sent(1);
    echoes.sent(2);

    expect(echoes.echoed(1)).toBe(true);
    expect(echoes.echoed(3)).toBe(false);
    expect(echoes.echoed(2)).toBe(true);
    expect(echoes.echoed(2)).toBe(false);
  });

  it('treats a late echo of an older value as stale and forgets the oldest of many', () => {
    const echoes = createEchoes<number>(Object.is);

    for (let value = 0; value < 10; value += 1) {
      echoes.sent(value);
    }

    expect(echoes.echoed(0)).toBe(false);
    expect(echoes.echoed(5)).toBe(true);
    expect(echoes.echoed(4)).toBe(false);
    expect(echoes.echoed(9)).toBe(true);
  });
});
