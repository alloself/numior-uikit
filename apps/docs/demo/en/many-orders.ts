import { orders, type Order, type OrderLine, type OrderStatus } from '#demo/orders';
import { pick, seeded, type Random } from '#demo/random';

const FIRST_ID = 21_000;
const LAST_DAY = Date.UTC(2026, 8, 27);
const DAY = 86_400_000;
const DAYS = 180;
const MAX_LINES = 3;
const MAX_QUANTITY = 3;

const STATUSES: readonly OrderStatus[] = [
  'delivered',
  'delivered',
  'delivered',
  'delivered',
  'shipped',
  'shipped',
  'paid',
  'paid',
  'pending',
  'cancelled',
];

const LINES = orders.flatMap((order) => order.lines);

const upTo = (random: Random, limit: number): number => 1 + Math.floor(random() * limit);

const lineOf = (random: Random): OrderLine => ({
  ...pick(random, LINES),
  quantity: upTo(random, MAX_QUANTITY),
});

const orderOf = (random: Random, index: number): Order => {
  const buyer = pick(random, orders);
  const lines = Array.from({ length: upTo(random, MAX_LINES) }, () => lineOf(random));

  return {
    id: FIRST_ID + index,
    date: new Date(LAST_DAY - Math.floor(random() * DAYS) * DAY).toISOString().slice(0, 10),
    customer: buyer.customer,
    city: buyer.city,
    status: pick(random, STATUSES),
    payment: pick(random, orders).payment,
    delivery: pick(random, orders).delivery,
    manager: pick(random, orders).manager,
    total: lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
    lines,
  };
};

export const ordersOf = (count: number, seed = 1): Order[] => {
  const random = seeded(seed);

  return Array.from({ length: count }, (_, index) => orderOf(random, index));
};
