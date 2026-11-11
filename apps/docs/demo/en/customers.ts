export interface Customer {
  readonly id: number;
  readonly name: string;
  readonly city: string;
  readonly email: string;
  readonly phone: string;
  readonly orders: number;
  readonly spent: number;
}

export const customers: readonly Customer[] = [
  {
    id: 1,
    name: 'Peter Wolfe',
    city: 'Boston',
    email: 'peter.wolfe@example.com',
    phone: '(617) 555-0101',
    orders: 14,
    spent: 2480,
  },
  {
    id: 2,
    name: 'Lena Ortiz',
    city: 'Chicago',
    email: 'lena.ortiz@example.com',
    phone: '(312) 555-0102',
    orders: 3,
    spent: 295,
  },
  {
    id: 3,
    name: 'Tim Sayed',
    city: 'Denver',
    email: 'tim.sayed@example.com',
    phone: '(303) 555-0103',
    orders: 8,
    spent: 1920,
  },
  {
    id: 4,
    name: 'Vera Lane',
    city: 'Boston',
    email: 'vera.lane@example.com',
    phone: '(617) 555-0104',
    orders: 1,
    spent: 180,
  },
  {
    id: 5,
    name: 'Glen Nash',
    city: 'Austin',
    email: 'glen.nash@example.com',
    phone: '(512) 555-0105',
    orders: 5,
    spent: 645,
  },
  {
    id: 6,
    name: 'Evan Porter',
    city: 'Seattle',
    email: 'evan.porter@example.com',
    phone: '(206) 555-0106',
    orders: 2,
    spent: 440,
  },
  {
    id: 7,
    name: 'Mary Cooper',
    city: 'Portland',
    email: 'mary.cooper@example.com',
    phone: '(503) 555-0107',
    orders: 11,
    spent: 1300,
  },
  {
    id: 8,
    name: 'Paul Hawkins',
    city: 'Boston',
    email: 'paul.hawkins@example.com',
    phone: '(617) 555-0108',
    orders: 6,
    spent: 965,
  },
  {
    id: 9,
    name: 'Olga Graham',
    city: 'Chicago',
    email: 'olga.graham@example.com',
    phone: '(312) 555-0109',
    orders: 4,
    spent: 530,
  },
  {
    id: 10,
    name: 'Sam Ellis',
    city: 'Denver',
    email: 'sam.ellis@example.com',
    phone: '(303) 555-0110',
    orders: 9,
    spent: 2190,
  },
  {
    id: 11,
    name: 'Nina Hart',
    city: 'Austin',
    email: 'nina.hart@example.com',
    phone: '(512) 555-0111',
    orders: 2,
    spent: 755,
  },
  {
    id: 12,
    name: 'Alina Yusuf',
    city: 'Portland',
    email: 'alina.yusuf@example.com',
    phone: '(503) 555-0112',
    orders: 7,
    spent: 820,
  },
];
