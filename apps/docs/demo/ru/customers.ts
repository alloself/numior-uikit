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
    name: 'Пётр Волков',
    city: 'Москва',
    email: 'volkov@example.com',
    phone: '+7 900 000-01-01',
    orders: 14,
    spent: 186400,
  },
  {
    id: 2,
    name: 'Лена Орлова',
    city: 'Санкт-Петербург',
    email: 'orlova@example.com',
    phone: '+7 900 000-01-02',
    orders: 3,
    spent: 21700,
  },
  {
    id: 3,
    name: 'Тимур Саидов',
    city: 'Казань',
    email: 'saidov@example.com',
    phone: '+7 900 000-01-03',
    orders: 8,
    spent: 143900,
  },
  {
    id: 4,
    name: 'Вера Лапина',
    city: 'Москва',
    email: 'lapina@example.com',
    phone: '+7 900 000-01-04',
    orders: 1,
    spent: 12800,
  },
  {
    id: 5,
    name: 'Глеб Носов',
    city: 'Екатеринбург',
    email: 'nosov@example.com',
    phone: '+7 900 000-01-05',
    orders: 5,
    spent: 48300,
  },
  {
    id: 6,
    name: 'Иван Попов',
    city: 'Новосибирск',
    email: 'popov@example.com',
    phone: '+7 900 000-01-06',
    orders: 2,
    spent: 33100,
  },
  {
    id: 7,
    name: 'Мария Кузнецова',
    city: 'Самара',
    email: 'kuznetsova@example.com',
    phone: '+7 900 000-01-07',
    orders: 11,
    spent: 97600,
  },
  {
    id: 8,
    name: 'Павел Соколов',
    city: 'Москва',
    email: 'sokolov@example.com',
    phone: '+7 900 000-01-08',
    orders: 6,
    spent: 72500,
  },
  {
    id: 9,
    name: 'Ольга Громова',
    city: 'Санкт-Петербург',
    email: 'gromova@example.com',
    phone: '+7 900 000-01-09',
    orders: 4,
    spent: 39800,
  },
  {
    id: 10,
    name: 'Сергей Ильин',
    city: 'Казань',
    email: 'ilin@example.com',
    phone: '+7 900 000-01-10',
    orders: 9,
    spent: 164200,
  },
  {
    id: 11,
    name: 'Нина Зайцева',
    city: 'Екатеринбург',
    email: 'zaitseva@example.com',
    phone: '+7 900 000-01-11',
    orders: 2,
    spent: 56700,
  },
  {
    id: 12,
    name: 'Алина Юсупова',
    city: 'Самара',
    email: 'yusupova@example.com',
    phone: '+7 900 000-01-12',
    orders: 7,
    spent: 61400,
  },
];
