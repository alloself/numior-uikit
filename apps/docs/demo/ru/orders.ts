export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
export type Payment = 'card' | 'transfer' | 'cash';
export type Delivery = 'courier' | 'pickup' | 'post';

export interface OrderLine {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
}

export interface Order {
  readonly id: number;
  readonly date: string;
  readonly customer: string;
  readonly city: string;
  readonly status: OrderStatus;
  readonly payment: Payment;
  readonly delivery: Delivery;
  readonly manager: string;
  readonly total: number;
  readonly lines: readonly OrderLine[];
}

export const ORDER_STATUSES: Record<OrderStatus, string> = {
  pending: 'Ждёт оплаты',
  paid: 'Оплачен',
  shipped: 'В доставке',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

export const PAYMENTS: Record<Payment, string> = {
  card: 'Картой',
  transfer: 'Переводом',
  cash: 'При получении',
};

export const DELIVERIES: Record<Delivery, string> = {
  courier: 'Курьер',
  pickup: 'Самовывоз',
  post: 'Почта',
};

export const orders: readonly Order[] = [
  {
    id: 20401,
    date: '2026-09-16',
    customer: 'Пётр Волков',
    city: 'Москва',
    status: 'delivered',
    payment: 'card',
    delivery: 'courier',
    manager: 'Анна Титова',
    total: 22700,
    lines: [
      { sku: 'S-101', name: 'Кресло «Осло»', quantity: 1, price: 18900 },
      { sku: 'X-507', name: 'Подушка «Лён»', quantity: 2, price: 1900 },
    ],
  },
  {
    id: 20402,
    date: '2026-09-17',
    customer: 'Лена Орлова',
    city: 'Санкт-Петербург',
    status: 'delivered',
    payment: 'card',
    delivery: 'pickup',
    manager: 'Анна Титова',
    total: 9800,
    lines: [{ sku: 'L-401', name: 'Лампа «Нурд»', quantity: 2, price: 4900 }],
  },
  {
    id: 20403,
    date: '2026-09-18',
    customer: 'Тимур Саидов',
    city: 'Казань',
    status: 'delivered',
    payment: 'transfer',
    delivery: 'courier',
    manager: 'Мария Ким',
    total: 37300,
    lines: [
      { sku: 'T-201', name: 'Стол «Мальмё»', quantity: 1, price: 24500 },
      { sku: 'S-104', name: 'Стул «Берген»', quantity: 2, price: 6400 },
    ],
  },
  {
    id: 20404,
    date: '2026-09-19',
    customer: 'Вера Лапина',
    city: 'Москва',
    status: 'cancelled',
    payment: 'card',
    delivery: 'courier',
    manager: 'Анна Титова',
    total: 12800,
    lines: [{ sku: 'S-110', name: 'Табурет «Лофт»', quantity: 4, price: 3200 }],
  },
  {
    id: 20405,
    date: '2026-09-20',
    customer: 'Глеб Носов',
    city: 'Екатеринбург',
    status: 'delivered',
    payment: 'cash',
    delivery: 'post',
    manager: 'Мария Ким',
    total: 11500,
    lines: [
      { sku: 'X-501', name: 'Плед «Шерсть»', quantity: 1, price: 3900 },
      { sku: 'X-507', name: 'Подушка «Лён»', quantity: 4, price: 1900 },
    ],
  },
  {
    id: 20406,
    date: '2026-09-21',
    customer: 'Иван Попов',
    city: 'Новосибирск',
    status: 'shipped',
    payment: 'card',
    delivery: 'courier',
    manager: 'Анна Титова',
    total: 14200,
    lines: [{ sku: 'H-301', name: 'Стеллаж «Вик»', quantity: 1, price: 14200 }],
  },
  {
    id: 20407,
    date: '2026-09-22',
    customer: 'Мария Кузнецова',
    city: 'Самара',
    status: 'shipped',
    payment: 'transfer',
    delivery: 'post',
    manager: 'Мария Ким',
    total: 30600,
    lines: [
      { sku: 'L-408', name: 'Торшер «Арка»', quantity: 1, price: 8700 },
      { sku: 'L-412', name: 'Подвес «Сфера»', quantity: 3, price: 7300 },
    ],
  },
  {
    id: 20408,
    date: '2026-09-23',
    customer: 'Павел Соколов',
    city: 'Москва',
    status: 'shipped',
    payment: 'card',
    delivery: 'courier',
    manager: 'Анна Титова',
    total: 26800,
    lines: [
      { sku: 'H-305', name: 'Комод «Фьорд»', quantity: 1, price: 21900 },
      { sku: 'L-401', name: 'Лампа «Нурд»', quantity: 1, price: 4900 },
    ],
  },
  {
    id: 20409,
    date: '2026-09-24',
    customer: 'Ольга Громова',
    city: 'Санкт-Петербург',
    status: 'paid',
    payment: 'card',
    delivery: 'pickup',
    manager: 'Мария Ким',
    total: 9800,
    lines: [{ sku: 'T-207', name: 'Журнальный стол «Тромсё»', quantity: 1, price: 9800 }],
  },
  {
    id: 20410,
    date: '2026-09-25',
    customer: 'Сергей Ильин',
    city: 'Казань',
    status: 'paid',
    payment: 'card',
    delivery: 'courier',
    manager: 'Анна Титова',
    total: 62900,
    lines: [
      { sku: 'S-104', name: 'Стул «Берген»', quantity: 6, price: 6400 },
      { sku: 'T-201', name: 'Стол «Мальмё»', quantity: 1, price: 24500 },
    ],
  },
  {
    id: 20411,
    date: '2026-09-26',
    customer: 'Нина Зайцева',
    city: 'Екатеринбург',
    status: 'pending',
    payment: 'transfer',
    delivery: 'courier',
    manager: 'Мария Ким',
    total: 37800,
    lines: [{ sku: 'S-101', name: 'Кресло «Осло»', quantity: 2, price: 18900 }],
  },
  {
    id: 20412,
    date: '2026-09-27',
    customer: 'Алина Юсупова',
    city: 'Самара',
    status: 'pending',
    payment: 'card',
    delivery: 'pickup',
    manager: 'Анна Титова',
    total: 12700,
    lines: [
      { sku: 'X-501', name: 'Плед «Шерсть»', quantity: 2, price: 3900 },
      { sku: 'L-401', name: 'Лампа «Нурд»', quantity: 1, price: 4900 },
    ],
  },
];
