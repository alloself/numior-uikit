import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vite-plus/test';
import { diffImages, diffScenes, isAllowed, tailOf, totalsOf } from './compare';
import { decodePng } from './png';
import { encodeScene, styleOf } from './store';
import type { Note, RawScene, StoredScene } from './parity.types';

const PROPERTIES = ['color', 'padding-left', 'display'];
const BUTTON = 'section.panel:0 > button.nui-button.nui-button--size-sm:1';
const UTILITY_BUTTON = 'button.nui-button.mt-3:2';
const RED = 5;
const BLACK = 2;

const scene = (
  color: string,
  extra: RawScene['nodes'] = [],
  notes: readonly Note[] = [],
): StoredScene => {
  const values = ['block', '0px', 'rgb(0, 0, 0)', '12px', 'inline-flex', color, '""'];

  return encodeScene(
    'pg-light-1440/buttons',
    PROPERTIES,
    {
      values,
      nodes: [
        [-1, 'section.panel:0', '0 0 800 200', [2, 1, 0]],
        [0, 'p:0', '0 0 800 20', [2, 1, 0]],
        [0, 'button.nui-button.nui-button--size-sm:1', '0 20 96 32', [5, 3, 4]],
        [2, '::before', '', [5, 1, 6]],
        ...extra,
      ],
    },
    notes,
  );
};

const positioned = (offset: string, padding: string): StoredScene =>
  encodeScene('pg-light-1440/buttons', ['background-position-x', 'padding-left'], {
    values: [offset, padding],
    nodes: [[-1, 'button.nui-button:0', '0 0 96 32', [0, 1]]],
  });

const laidOut = (display: string, alignment: string, columns: string): StoredScene =>
  encodeScene('pg-light-1440/fields', ['display', 'align-content', 'grid-template-columns'], {
    values: [display, alignment, columns],
    nodes: [[-1, 'div.nui-field:0', '0 0 320 64', [0, 1, 2]]],
  });

const outlined = (style: string, color: string, duration: string): StoredScene =>
  encodeScene('pg-light-1440/buttons', ['outline-style', 'outline-color', 'transition-duration'], {
    values: [style, color, duration],
    nodes: [[-1, 'button.nui-button:0', '0 0 96 32', [0, 1, 2]]],
  });

const withButton = (segment: string, color: number): StoredScene =>
  scene('red', [
    [0, segment, '0 60 96 32', [5, 3, 4]],
    [4, 'span:0', '0 60 5 5', [color, 1, 0]],
  ]);

const fadeOf = (button: string): Note => [
  `section.panel:0 > ${button} | motion transition opacity`,
  '{"duration":200}',
];

const chunk = (type: string, data: Buffer): Buffer => {
  const head = Buffer.alloc(8);

  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, data, Buffer.alloc(4)]);
};

const png = (width: number, rows: readonly (readonly number[])[]): Buffer => {
  const header = Buffer.alloc(13);

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(rows.length, 4);
  header.set([8, 2, 0, 0, 0], 8);

  return Buffer.concat([
    Buffer.alloc(8),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from(rows.flat()))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

describe('scene comparison', () => {
  it('reports nothing for two takes of the same scene', () => {
    expect(diffScenes(scene('rgb(255, 255, 255)'), scene('rgb(255, 255, 255)'))).toEqual([]);
  });

  it('names the element, the property and both values of a changed declaration', () => {
    const findings = diffScenes(scene('rgb(255, 255, 255)'), scene('rgb(250, 250, 250)'));

    expect(findings).toEqual([
      {
        scene: 'pg-light-1440/buttons',
        element: BUTTON,
        property: 'color',
        before: 'rgb(255, 255, 255)',
        after: 'rgb(250, 250, 250)',
      },
      {
        scene: 'pg-light-1440/buttons',
        element: `${BUTTON} > ::before`,
        property: 'color',
        before: 'rgb(255, 255, 255)',
        after: 'rgb(250, 250, 250)',
      },
    ]);
  });

  it('reports a moved box and only the top of an added subtree', () => {
    const base = scene('red');

    const next = scene('red', [
      [0, 'div.extra:2', '0 60 10 10', [2, 1, 0]],
      [4, 'span:0', '0 60 5 5', [2, 1, 0]],
    ]);

    const moved: StoredScene = {
      ...base,
      nodes: base.nodes.map((node) =>
        node[1] === 'p:0' ? [node[0], node[1], '0 4 800 20', node[3]] : node,
      ),
    };

    expect(diffScenes(base, next).map((finding) => [finding.element, finding.after])).toEqual([
      ['section.panel:0 > div.extra:2', 'present'],
    ]);

    expect(diffScenes(next, base).map((finding) => finding.after)).toEqual(['missing']);

    expect(diffScenes(base, moved)).toEqual([
      {
        scene: base.name,
        element: 'section.panel:0 > p:0',
        property: '(rect)',
        before: '0 0 800 20',
        after: '0 4 800 20',
      },
    ]);
  });

  it('matches an element whose listed class was dropped and still compares its values', () => {
    const plain = withButton('button.nui-button:2', RED);
    const change = { element: '^button\\.nui-button\\.mt-3$', dropped: ['mt-3'], reason: 'dead' };

    expect(
      diffScenes(withButton(UTILITY_BUTTON, RED), plain).map((finding) => finding.property),
    ).toEqual(['(element)', '(element)']);

    expect(diffScenes(withButton(UTILITY_BUTTON, RED), plain, [change])).toEqual([]);

    expect(
      diffScenes(withButton(UTILITY_BUTTON, BLACK), plain, [change]).map((finding) => [
        finding.element,
        finding.property,
      ]),
    ).toEqual([['section.panel:0 > button.nui-button:2 > span:0', 'color']]);
  });

  it('reports a changed, a lost and a new motion record', () => {
    const fade: Note = [`${BUTTON} | motion transition opacity`, '{"duration":200}'];
    const slide: Note = [`${BUTTON} | motion transition translate`, '{"duration":200}'];
    const slower: Note = [fade[0], '{"duration":320}'];
    const base = scene('red', [], [fade, slide]);

    expect(diffScenes(base, scene('red', [], [slower]))).toEqual([
      {
        scene: base.name,
        element: BUTTON,
        property: 'motion transition opacity',
        before: '{"duration":200}',
        after: '{"duration":320}',
      },
      {
        scene: base.name,
        element: BUTTON,
        property: 'motion transition translate',
        before: '{"duration":200}',
        after: '(absent)',
      },
    ]);

    expect(diffScenes(scene('red'), base).map((finding) => finding.before)).toEqual([
      '(absent)',
      '(absent)',
    ]);
  });

  it('keys a motion record by its element without the dropped classes', () => {
    const change = { element: '^button\\.nui-button\\.mt-3$', dropped: ['mt-3'], reason: 'dead' };
    const base = scene('red', [], [fadeOf(UTILITY_BUTTON)]);
    const next = scene('red', [], [fadeOf('button.nui-button:2')]);

    expect(diffScenes(base, next).map((finding) => finding.after)).toEqual([
      '(absent)',
      '{"duration":200}',
    ]);

    expect(diffScenes(base, next, [change])).toEqual([]);
  });

  it('refuses to compare takes made with different property lists', () => {
    const other = encodeScene('pg-light-1440/buttons', ['color'], { values: ['red'], nodes: [] });

    expect(() => diffScenes(scene('red'), other)).toThrow('retake the baseline');
  });

  it('takes flex-start for start on a grid and a track repeated once for the track', () => {
    const single = 'minmax(0px, 1fr)';
    const repeated = `repeat(1, ${single})`;

    const findings = [
      ...diffScenes(laidOut('grid', 'start', single), laidOut('grid', 'flex-start', repeated)),
      ...diffScenes(laidOut('flex', 'start', single), laidOut('flex', 'flex-start', single)),
    ];

    expect(findings.map(({ property, after }) => `${property} ${after}`)).toEqual([
      'align-content flex-start',
    ]);
  });

  it('takes a zero background offset in pixels and in percent for the same position', () => {
    const before = positioned('0px, 10px', '0px');

    const findings = [
      ...diffScenes(before, positioned('0%, 10px', '0px')),
      ...diffScenes(before, positioned('0%, 10%', '0%')),
    ];

    expect(findings.map(({ property, after }) => `${property} ${after}`)).toEqual([
      'background-position-x 0%, 10%',
      'padding-left 0%',
    ]);
  });

  it('passes the colour of an outline that paints nothing and a repeated timing list', () => {
    const before = outlined('none', 'rgb(16, 16, 16)', '0.12s, 0.12s');

    const findings = [
      ...diffScenes(before, outlined('none', 'rgb(0, 0, 0)', '0.12s')),
      ...diffScenes(before, outlined('solid', 'rgb(0, 0, 0)', '0.12s, 0.2s')),
    ];

    expect(findings.map(({ property, after }) => `${property} ${after}`)).toEqual([
      'outline-style solid',
      'outline-color rgb(0, 0, 0)',
      'transition-duration 0.12s, 0.2s',
    ]);
  });

  it('restores every value of a stored node and counts what was compared', () => {
    const stored = scene('red');
    const [, , button] = stored.nodes;

    expect(button === undefined ? [] : styleOf(stored, button)).toEqual([
      'red',
      '12px',
      'inline-flex',
    ]);

    expect(totalsOf(stored)).toEqual({ elements: 4, values: 16 });
  });

  it('groups findings by the element without sibling positions', () => {
    expect(tailOf(BUTTON)).toBe('button.nui-button.nui-button--size-sm');
    expect(tailOf(`${BUTTON} > ::before`)).toBe('button.nui-button.nui-button--size-sm::before');
    expect(tailOf('html:0')).toBe('html');
  });

  it('lets a finding pass only when every stated pattern of an allowance matches', () => {
    const [finding] = diffScenes(scene('red'), scene('blue'));
    const allowance = { scene: '^pg-', element: 'nui-button', property: '^color$', reason: 'x' };

    expect(finding !== undefined && isAllowed(finding, [allowance])).toBe(true);

    expect(finding !== undefined && isAllowed(finding, [{ ...allowance, scene: '^docs-' }])).toBe(
      false,
    );
  });
});

describe('pixel comparison', () => {
  const rows = [
    [0, 10, 20, 30, 40, 50, 60],
    [1, 5, 5, 5, 1, 1, 1],
    [2, 1, 1, 1, 2, 2, 2],
    [3, 0, 0, 0, 4, 4, 4],
    [4, 1, 1, 1, 1, 1, 1],
  ];

  it('decodes every scanline filter of an RGB image', () => {
    const image = decodePng(png(2, rows));

    expect([image.width, image.height, image.channels]).toEqual([2, 5, 3]);

    expect(Array.from(image.pixels)).toEqual([
      10, 20, 30, 40, 50, 60, 5, 5, 5, 6, 6, 6, 6, 6, 6, 8, 8, 8, 3, 3, 3, 9, 9, 9, 4, 4, 4, 10, 10,
      10,
    ]);
  });

  it('passes equal images and locates the pixels that differ', () => {
    const changed = rows.map((row, at) => (at === 4 ? [4, 1, 1, 1, 1, 9, 1] : row));

    expect(diffImages('s', png(2, rows), png(2, rows))).toEqual([]);

    expect(diffImages('s', png(2, rows), png(2, changed))).toEqual([
      {
        scene: 's',
        element: '(pixels)',
        property: 'png',
        before: 'baseline',
        after: '1 px differ within x 1..1, y 4..4',
      },
    ]);

    expect(diffImages('s', png(2, rows), png(1, [[0, 1, 2, 3]]))[0]?.after).toBe('size 1x1');
  });

  it('passes a scene taken without pictures and reports a picture only one take has', () => {
    const picture = png(1, [[0, 1, 2, 3]]);

    expect(diffImages('s', undefined, undefined)).toEqual([]);

    expect(
      diffImages('s', picture, undefined).map((finding) => [finding.before, finding.after]),
    ).toEqual([['present', 'missing']]);

    expect(diffImages('s', undefined, picture)[0]?.after).toBe('present');
  });

  it('rejects images it cannot read', () => {
    expect(() => decodePng(Buffer.alloc(8))).toThrow('header is missing');
  });
});
