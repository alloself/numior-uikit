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

const fromCode = (code: number): string =>
  code > 0 && code <= MAX_CODE_POINT && (code < 0xd8_00 || code > 0xdf_ff)
    ? String.fromCodePoint(code)
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

export const decodeEntities = (text: string): string =>
  text.includes('&') ? text.replaceAll(ENTITY, decodeOne) : text;
