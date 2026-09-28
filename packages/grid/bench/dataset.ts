import type { GridEngineColumn } from '../src/engine';

export interface BenchRow {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly city: string;
  readonly country: string;
  readonly status: string;
  readonly amount: number;
  readonly qty: number;
  readonly price: number;
  readonly discount: number | null;
  readonly created: number;
  readonly updated: number;
  readonly active: boolean;
  readonly vip: boolean;
  readonly tags: string;
  readonly region: string;
  readonly manager: string;
  readonly phone: string;
  readonly notes: string | null;
  readonly score: number;
}

const FIRST_NAMES = [
  'Anna',
  'Ivan',
  'Maria',
  'Pavel',
  'Olga',
  'Sergey',
  'Elena',
  'Dmitry',
  'Nina',
  'Igor',
];

const LAST_NAMES = [
  'Smirnova',
  'Ivanov',
  'Kuznetsova',
  'Popov',
  'Sokolova',
  'Lebedev',
  'Kozlova',
  'Novikov',
];

const CITIES = [
  'Moscow',
  'Saint Petersburg',
  'Kazan',
  'Novosibirsk',
  'Yerevan',
  'Almaty',
  'Belgrade',
  'Tbilisi',
  'Minsk',
  'Tashkent',
  'Riga',
  'Vilnius',
  'Warsaw',
  'Prague',
  'Vienna',
  'Berlin',
  'Paris',
  'Madrid',
  'Lisbon',
  'Rome',
];

const COUNTRIES = [
  'RU',
  'AM',
  'KZ',
  'RS',
  'GE',
  'BY',
  'UZ',
  'LV',
  'LT',
  'PL',
  'CZ',
  'AT',
  'DE',
  'FR',
  'ES',
  'PT',
  'IT',
];

const STATUSES = ['new', 'active', 'paused', 'closed'];
const REGIONS = ['north', 'south', 'east', 'west', 'central'];
const TAGS = ['retail', 'wholesale', 'vip', 'partner', 'trial', 'enterprise'];
const DAY = 86_400_000;
const EPOCH = Date.UTC(2020, 0, 1);

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const pick = <V>(random: () => number, list: readonly V[]): V => {
  const value = list[Math.floor(random() * list.length)];

  if (value === undefined) {
    throw new Error('Cannot pick from an empty list');
  }
  return value;
};

export const generateRows = (count: number, seed = 1): BenchRow[] => {
  const random = mulberry32(seed);
  const rows: BenchRow[] = [];

  for (let id = 0; id < count; id += 1) {
    const first = pick(random, FIRST_NAMES);
    const last = pick(random, LAST_NAMES);
    const created = EPOCH + Math.floor(random() * 2000) * DAY;
    const qty = 1 + Math.floor(random() * 50);
    const price = Math.round(random() * 100_000) / 100;

    rows.push({
      id,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${id}@example.com`,
      city: pick(random, CITIES),
      country: pick(random, COUNTRIES),
      status: pick(random, STATUSES),
      amount: Math.round(qty * price * 100) / 100,
      qty,
      price,
      discount: random() < 0.3 ? null : Math.round(random() * 5000) / 100,
      created,
      updated: created + Math.floor(random() * 400) * DAY,
      active: random() < 0.8,
      vip: random() < 0.1,
      tags: pick(random, TAGS),
      region: pick(random, REGIONS),
      manager: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
      phone: `+7 9${String(Math.floor(random() * 1_000_000_000)).padStart(9, '0')}`,
      notes: random() < 0.5 ? null : `Order ${id} note`,
      score: Math.round(random() * 1000) / 10,
    });
  }
  return rows;
};

export const BENCH_COLUMNS: readonly GridEngineColumn<BenchRow>[] = [
  { kind: 'number', key: 'id', value: (row) => row.id },
  { kind: 'string', key: 'name', value: (row) => row.name },
  { kind: 'string', key: 'email', value: (row) => row.email },
  { kind: 'string', key: 'city', value: (row) => row.city },
  { kind: 'string', key: 'country', value: (row) => row.country },
  { kind: 'string', key: 'status', value: (row) => row.status },
  { kind: 'number', key: 'amount', value: (row) => row.amount, aggregate: 'sum' },
  { kind: 'number', key: 'qty', value: (row) => row.qty, aggregate: 'count' },
  { kind: 'number', key: 'price', value: (row) => row.price, aggregate: 'avg' },
  { kind: 'number', key: 'discount', value: (row) => row.discount },
  { kind: 'date', key: 'created', value: (row) => row.created },
  { kind: 'date', key: 'updated', value: (row) => row.updated },
  { kind: 'boolean', key: 'active', value: (row) => row.active },
  { kind: 'boolean', key: 'vip', value: (row) => row.vip },
  { kind: 'string', key: 'tags', value: (row) => row.tags },
  { kind: 'string', key: 'region', value: (row) => row.region },
  { kind: 'string', key: 'manager', value: (row) => row.manager },
  { kind: 'string', key: 'phone', value: (row) => row.phone },
  { kind: 'string', key: 'notes', value: (row) => row.notes },
  { kind: 'number', key: 'score', value: (row) => row.score },
];

export interface BenchNode {
  readonly id: number;
  readonly name: string;
  readonly size: number;
  readonly items?: readonly BenchNode[];
}

export const TREE_COLUMNS: readonly GridEngineColumn<BenchNode>[] = [
  { kind: 'string', key: 'name', value: (row) => row.name },
  { kind: 'number', key: 'size', value: (row) => row.size, aggregate: 'sum' },
];

export const generateTree = (count: number, seed = 2): BenchNode[] => {
  const random = mulberry32(seed);
  const cursor = { next: 0 };

  const node = (depth: number): BenchNode => {
    const id = cursor.next;
    cursor.next += 1;
    const width = depth === 0 ? 10 : depth === 1 ? 9 : 0;
    const items: BenchNode[] = [];

    for (let index = 0; index < width && cursor.next < count; index += 1) {
      items.push(node(depth + 1));
    }
    return {
      id,
      name: `node ${Math.floor(random() * 1_000_000)}`,
      size: Math.floor(random() * 10_000),
      ...(items.length > 0 ? { items } : {}),
    };
  };

  const roots: BenchNode[] = [];

  while (cursor.next < count) {
    roots.push(node(0));
  }
  return roots;
};
