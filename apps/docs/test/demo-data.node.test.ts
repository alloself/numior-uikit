import { describe, expect, it } from 'vite-plus/test';
import { customers as enCustomers } from '../demo/en/customers';
import { ordersOf as enOrdersOf } from '../demo/en/many-orders';
import { orders as enOrders, type Order } from '../demo/en/orders';
import { categories as enCategories, products as enProducts } from '../demo/en/products';
import { team as enTeam } from '../demo/en/team';
import { customers as ruCustomers } from '../demo/ru/customers';
import { ordersOf as ruOrdersOf } from '../demo/ru/many-orders';
import { orders as ruOrders } from '../demo/ru/orders';
import { categories as ruCategories, products as ruProducts } from '../demo/ru/products';
import { team as ruTeam } from '../demo/ru/team';
import { pick, seeded } from '../demo/shared/random';

interface Shop {
  readonly orders: readonly Order[];
  readonly ordersOf: (count: number, seed?: number) => Order[];
  readonly customers: readonly { readonly name: string; readonly city: string }[];
  readonly products: readonly {
    readonly sku: string;
    readonly name: string;
    readonly price: number;
    readonly category: string;
  }[];
  readonly categories: readonly { readonly children?: readonly { readonly value: string }[] }[];
  readonly team: readonly { readonly name: string }[];
}

const SHOPS: Readonly<Record<string, Shop>> = {
  ru: {
    orders: ruOrders,
    ordersOf: ruOrdersOf,
    customers: ruCustomers,
    products: ruProducts,
    categories: ruCategories,
    team: ruTeam,
  },
  en: {
    orders: enOrders,
    ordersOf: enOrdersOf,
    customers: enCustomers,
    products: enProducts,
    categories: enCategories,
    team: enTeam,
  },
};

const sumOf = (order: Order): number =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.price, 0);

const strangers = (shop: Shop): string[] =>
  shop.orders.reduce<string[]>((found, order) => {
    const customer = shop.customers.find((entry) => entry.name === order.customer);

    if (customer?.city !== order.city) {
      found.push(`${order.id}: ${order.customer}, ${order.city}`);
    }
    if (!shop.team.some((employee) => employee.name === order.manager)) {
      found.push(`${order.id}: ${order.manager}`);
    }
    return found;
  }, []);

const unknownLines = (shop: Shop): string[] =>
  shop.orders.flatMap((order) =>
    order.lines.reduce<string[]>((found, line) => {
      const product = shop.products.find((entry) => entry.sku === line.sku);

      if (product?.name !== line.name || product.price !== line.price) {
        found.push(`${order.id}: ${line.sku}`);
      }
      return found;
    }, []),
  );

const uncategorized = (shop: Shop): string[] => {
  const leaves = shop.categories.flatMap((category) =>
    (category.children ?? []).map((child) => child.value),
  );

  return shop.products.reduce<string[]>((found, product) => {
    if (!leaves.includes(product.category)) {
      found.push(product.sku);
    }
    return found;
  }, []);
};

describe.each(Object.entries(SHOPS))('shop data of the %s docs', (_, shop) => {
  it('keeps every order consistent with the customers, the team and the catalogue', () => {
    expect(shop.orders).toHaveLength(12);
    expect(shop.customers).toHaveLength(12);
    expect(shop.products).toHaveLength(12);

    expect(strangers(shop)).toEqual([]);
    expect(unknownLines(shop)).toEqual([]);
    expect(uncategorized(shop)).toEqual([]);
    expect(shop.orders.filter((order) => order.total !== sumOf(order))).toEqual([]);
  });

  it('generates the same long list of orders for the same seed', () => {
    const many = shop.ordersOf(20_000);

    expect(many).toHaveLength(20_000);
    expect(new Set(many.map((order) => order.id)).size).toBe(20_000);
    expect(many.filter((order) => order.total !== sumOf(order))).toEqual([]);

    expect(many.filter((order) => order.date < '2026-03-01' || order.date > '2026-09-27')).toEqual(
      [],
    );

    expect(shop.ordersOf(50, 7)).toEqual(shop.ordersOf(50, 7));
    expect(shop.ordersOf(50, 7)).not.toEqual(shop.ordersOf(50, 8));
    expect(shop.ordersOf(50)).toEqual(many.slice(0, 50));
  });
});

describe('seeded random of the shop data', () => {
  it('repeats its sequence and refuses to pick from an empty list', () => {
    const [first, second] = [seeded(42), seeded(42)];
    const values = Array.from({ length: 1000 }, () => first());

    expect(values).toEqual(Array.from({ length: 1000 }, () => second()));
    expect(values.filter((value) => value < 0 || value >= 1)).toEqual([]);
    expect(new Set(values).size).toBeGreaterThan(990);

    expect(['courier', 'pickup', 'post']).toContain(pick(seeded(3), ['courier', 'pickup', 'post']));
    expect(() => pick(seeded(3), [])).toThrow('pick needs a list with items');
  });
});
