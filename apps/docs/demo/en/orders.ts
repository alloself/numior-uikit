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
  pending: 'Awaiting payment',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Canceled',
};

export const PAYMENTS: Record<Payment, string> = {
  card: 'Card',
  transfer: 'Bank transfer',
  cash: 'On delivery',
};

export const DELIVERIES: Record<Delivery, string> = {
  courier: 'Courier',
  pickup: 'Pickup',
  post: 'Mail',
};

export const orders: readonly Order[] = [
  {
    id: 20401,
    date: '2026-09-16',
    customer: 'Peter Wolfe',
    city: 'Boston',
    status: 'delivered',
    payment: 'card',
    delivery: 'courier',
    manager: 'Anna Turner',
    total: 307,
    lines: [
      { sku: 'S-101', name: 'Oslo armchair', quantity: 1, price: 249 },
      { sku: 'X-507', name: 'Linen pillow', quantity: 2, price: 29 },
    ],
  },
  {
    id: 20402,
    date: '2026-09-17',
    customer: 'Lena Ortiz',
    city: 'Chicago',
    status: 'delivered',
    payment: 'card',
    delivery: 'pickup',
    manager: 'Anna Turner',
    total: 138,
    lines: [{ sku: 'L-401', name: 'Nord table lamp', quantity: 2, price: 69 }],
  },
  {
    id: 20403,
    date: '2026-09-18',
    customer: 'Tim Sayed',
    city: 'Denver',
    status: 'delivered',
    payment: 'transfer',
    delivery: 'courier',
    manager: 'Maria Kim',
    total: 507,
    lines: [
      { sku: 'T-201', name: 'Malmo desk', quantity: 1, price: 329 },
      { sku: 'S-104', name: 'Bergen chair', quantity: 2, price: 89 },
    ],
  },
  {
    id: 20404,
    date: '2026-09-19',
    customer: 'Vera Lane',
    city: 'Boston',
    status: 'cancelled',
    payment: 'card',
    delivery: 'courier',
    manager: 'Anna Turner',
    total: 180,
    lines: [{ sku: 'S-110', name: 'Loft stool', quantity: 4, price: 45 }],
  },
  {
    id: 20405,
    date: '2026-09-20',
    customer: 'Glen Nash',
    city: 'Austin',
    status: 'delivered',
    payment: 'cash',
    delivery: 'post',
    manager: 'Maria Kim',
    total: 175,
    lines: [
      { sku: 'X-501', name: 'Wool throw', quantity: 1, price: 59 },
      { sku: 'X-507', name: 'Linen pillow', quantity: 4, price: 29 },
    ],
  },
  {
    id: 20406,
    date: '2026-09-21',
    customer: 'Evan Porter',
    city: 'Seattle',
    status: 'shipped',
    payment: 'card',
    delivery: 'courier',
    manager: 'Anna Turner',
    total: 199,
    lines: [{ sku: 'H-301', name: 'Vik shelving unit', quantity: 1, price: 199 }],
  },
  {
    id: 20407,
    date: '2026-09-22',
    customer: 'Mary Cooper',
    city: 'Portland',
    status: 'shipped',
    payment: 'transfer',
    delivery: 'post',
    manager: 'Maria Kim',
    total: 416,
    lines: [
      { sku: 'L-408', name: 'Arc floor lamp', quantity: 1, price: 119 },
      { sku: 'L-412', name: 'Sphere pendant', quantity: 3, price: 99 },
    ],
  },
  {
    id: 20408,
    date: '2026-09-23',
    customer: 'Paul Hawkins',
    city: 'Boston',
    status: 'shipped',
    payment: 'card',
    delivery: 'courier',
    manager: 'Anna Turner',
    total: 368,
    lines: [
      { sku: 'H-305', name: 'Fjord dresser', quantity: 1, price: 299 },
      { sku: 'L-401', name: 'Nord table lamp', quantity: 1, price: 69 },
    ],
  },
  {
    id: 20409,
    date: '2026-09-24',
    customer: 'Olga Graham',
    city: 'Chicago',
    status: 'paid',
    payment: 'card',
    delivery: 'pickup',
    manager: 'Maria Kim',
    total: 139,
    lines: [{ sku: 'T-207', name: 'Tromso coffee table', quantity: 1, price: 139 }],
  },
  {
    id: 20410,
    date: '2026-09-25',
    customer: 'Sam Ellis',
    city: 'Denver',
    status: 'paid',
    payment: 'card',
    delivery: 'courier',
    manager: 'Anna Turner',
    total: 863,
    lines: [
      { sku: 'S-104', name: 'Bergen chair', quantity: 6, price: 89 },
      { sku: 'T-201', name: 'Malmo desk', quantity: 1, price: 329 },
    ],
  },
  {
    id: 20411,
    date: '2026-09-26',
    customer: 'Nina Hart',
    city: 'Austin',
    status: 'pending',
    payment: 'transfer',
    delivery: 'courier',
    manager: 'Maria Kim',
    total: 498,
    lines: [{ sku: 'S-101', name: 'Oslo armchair', quantity: 2, price: 249 }],
  },
  {
    id: 20412,
    date: '2026-09-27',
    customer: 'Alina Yusuf',
    city: 'Portland',
    status: 'pending',
    payment: 'card',
    delivery: 'pickup',
    manager: 'Anna Turner',
    total: 187,
    lines: [
      { sku: 'X-501', name: 'Wool throw', quantity: 2, price: 59 },
      { sku: 'L-401', name: 'Nord table lamp', quantity: 1, price: 69 },
    ],
  },
];
