const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '‌',
  zwj: '‍',
  shy: '­',
  ndash: '–',
  mdash: '—',
  minus: '−',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  bull: '•',
  middot: '·',
  times: '×',
  divide: '÷',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  deg: '°',
  sect: '§',
  para: '¶',
  plusmn: '±',
  larr: '←',
  rarr: '→',
  uarr: '↑',
  darr: '↓',
};

const BARE = new Set(['amp', 'lt', 'gt', 'quot', 'nbsp']);

const ENTITY = /&(#\d{1,7}|#x[\da-f]{1,6}|[a-z]{2,8});?/giu;

const MAX_CODE_POINT = 0x10_ff_ff;

const WINDOWS_1252: ReadonlyMap<number, number> = new Map([
  [0x80, 0x20_ac],
  [0x82, 0x20_1a],
  [0x83, 0x01_92],
  [0x84, 0x20_1e],
  [0x85, 0x20_26],
  [0x86, 0x20_20],
  [0x87, 0x20_21],
  [0x88, 0x02_c6],
  [0x89, 0x20_30],
  [0x8a, 0x01_60],
  [0x8b, 0x20_39],
  [0x8c, 0x01_52],
  [0x8e, 0x01_7d],
  [0x91, 0x20_18],
  [0x92, 0x20_19],
  [0x93, 0x20_1c],
  [0x94, 0x20_1d],
  [0x95, 0x20_22],
  [0x96, 0x20_13],
  [0x97, 0x20_14],
  [0x98, 0x02_dc],
  [0x99, 0x21_22],
  [0x9a, 0x01_61],
  [0x9b, 0x20_3a],
  [0x9c, 0x01_53],
  [0x9e, 0x01_7e],
  [0x9f, 0x01_78],
]);

const NAME_GOES_ON = /^[=\da-z]/iu;

const fromCode = (code: number): string =>
  code > 0 && code <= MAX_CODE_POINT && (code < 0xd8_00 || code > 0xdf_ff)
    ? String.fromCodePoint(WINDOWS_1252.get(code) ?? code)
    : '�';

const decodeOne = (match: string, body: string): string => {
  if (body.startsWith('#x') || body.startsWith('#X')) {
    return fromCode(Number.parseInt(body.slice(2), 16));
  }
  if (body.startsWith('#')) {
    return fromCode(Number.parseInt(body.slice(1), 10));
  }
  const name = body.toLowerCase();
  const char = NAMED[name];

  return char === undefined || (!match.endsWith(';') && !BARE.has(name)) ? match : char;
};

const decodeInValue = (match: string, body: string, offset: number, value: string): string => {
  const open = !match.endsWith(';') && !body.startsWith('#');

  return open && NAME_GOES_ON.test(value.slice(offset + match.length))
    ? match
    : decodeOne(match, body);
};

export const decodeEntities = (text: string): string =>
  text.includes('&') ? text.replaceAll(ENTITY, decodeOne) : text;

export const decodeAttribute = (value: string): string =>
  value.includes('&') ? value.replaceAll(ENTITY, decodeInValue) : value;
